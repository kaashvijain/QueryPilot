import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from db import get_dataset_full_schema
from services.llm_service import LLMClient
from services.sql_generator import generate_sql_from_question, SQLGenerationResult
from services.sql_validator import validate_sql_query
from services.query_executor import execute_query, SQLExecutionResult
from services.sql_corrector import generate_corrected_sql
from services.chart_selector import select_visualization
from services.insight_generator import generate_insight_from_results

logger = logging.getLogger("querypilot.query_pipeline")


class QueryResultsSchema(BaseModel):
    """Schema representing executed query tabular results."""
    columns: List[str] = Field(default_factory=list, description="Column names returned by the query")
    rows: List[List[Any]] = Field(default_factory=list, description="Data rows returned by the query")
    row_count: int = Field(default=0, description="Total row count")
    execution_time_ms: float = Field(default=0.0, description="Execution duration in milliseconds")


class QueryPipelineResult(BaseModel):
    """Structured response returned by the self-correction query pipeline."""
    dataset_id: str
    question: str
    sql: str = Field(default="", description="Final generated or corrected SQL query")
    explanation: str = Field(default="", description="Plain-English explanation of the calculation")
    insight: str = Field(default="", description="Data-grounded natural language insight")
    chart_type: str = Field(default="table", description="Recommended visualization chart type")
    results: Optional[QueryResultsSchema] = Field(default=None, description="Executed query results if successful")
    attempts: int = Field(default=1, description="Number of attempts executed (maximum 3)")
    success: bool = Field(default=True, description="True if query succeeded within max_attempts")
    error_message: Optional[str] = Field(default=None, description="Error message if query pipeline failed")


def is_unsafe_validation_error(reason: Optional[str]) -> bool:
    """Returns True if validation error is due to an unsafe prohibited operation (e.g. DROP, DELETE)."""
    if not reason:
        return False
    reason_lower = reason.lower()
    return (
        "prohibited operation" in reason_lower
        or "only read-only select queries are allowed" in reason_lower
        or "multiple sql statements" in reason_lower
    )


def run_query_pipeline(
    dataset_id: str,
    question: str,
    db_path: Optional[str] = None,
    max_attempts: int = 3,
    llm_client: Optional[LLMClient] = None,
) -> QueryPipelineResult:
    """
    Coordinates SQL generation, static & schema validation, DuckDB execution, and automatic LLM self-correction.
    
    Flow:
      1. Generate SQL (Attempt 1: sql_generator, Attempt 2..N: sql_corrector).
      2. Validate SQL (sql_validator).
         - If unsafe (e.g. DROP, DELETE), STOPS IMMEDIATELY with 0 retries.
         - If schema/syntax error, saves error and proceeds to correction retry.
      3. Execute SQL against DuckDB (query_executor).
         - If successful, STOPS IMMEDIATELY and returns results & attempt count.
         - If execution fails, saves error and proceeds to correction retry.
      4. Maximum 3 attempts limit avoids infinite loops.
    """
    if not question or not question.strip():
        return QueryPipelineResult(
            dataset_id=dataset_id,
            question=question,
            success=False,
            error_message="Question cannot be empty.",
            attempts=0,
        )

    try:
        schema_info = get_dataset_full_schema(dataset_id, db_path=db_path)
    except Exception as exc:
        return QueryPipelineResult(
            dataset_id=dataset_id,
            question=question,
            success=False,
            error_message=f"Failed to retrieve dataset schema: {str(exc)}",
            attempts=0,
        )

    client = llm_client or LLMClient()
    current_sql = ""
    current_explanation = ""
    current_chart_type = "table"
    last_error = ""

    for attempt in range(1, max_attempts + 1):
        logger.info(f"Query Pipeline Execution Attempt {attempt}/{max_attempts} for dataset '{dataset_id}'")

        # 1. SQL Generation (Attempt 1 or if no SQL generated yet: sql_generator, otherwise: sql_corrector)
        if attempt == 1 or not current_sql:
            gen_res: SQLGenerationResult = generate_sql_from_question(
                question=question,
                schema_info=schema_info,
                llm_client=client,
            )
        else:
            gen_res: SQLGenerationResult = generate_corrected_sql(
                question=question,
                schema_info=schema_info,
                failed_sql=current_sql,
                error_message=last_error,
                llm_client=client,
            )

        if not gen_res.success:
            last_error = gen_res.error_message or "Failed to generate SQL from LLM."
            logger.warning(f"Attempt {attempt} SQL generation failed: {last_error}")
            continue

        current_sql = gen_res.sql
        current_explanation = gen_res.explanation
        current_chart_type = gen_res.chart_type

        # 2. Static & Schema Validation
        val_res = validate_sql_query(current_sql, schema_info=schema_info)
        if not val_res.valid:
            last_error = val_res.reason or "SQL validation failed."
            logger.warning(f"Attempt {attempt} validation failed: {last_error}")

            # Safety Guard: Stop immediately if query contains destructive operations or multi-statements
            if is_unsafe_validation_error(val_res.reason):
                logger.error(f"Attempt {attempt} blocked due to unsafe query: {last_error}")
                return QueryPipelineResult(
                    dataset_id=dataset_id,
                    question=question,
                    sql=current_sql,
                    explanation=current_explanation,
                    chart_type=current_chart_type,
                    attempts=attempt,
                    success=False,
                    error_message=last_error,
                )

            continue

        # 3. DuckDB Query Execution
        exec_res: SQLExecutionResult = execute_query(
            dataset_id=dataset_id,
            sql=current_sql,
            db_path=db_path,
            schema_info=schema_info,
        )

        if exec_res.success:
            logger.info(f"Query Pipeline succeeded on attempt {attempt}/{max_attempts}")
            deterministic_chart_type = select_visualization(
                columns=exec_res.columns,
                rows=exec_res.rows,
                row_count=exec_res.row_count,
                question=question,
            )

            # Generate concise, data-grounded natural language insight
            insight_res = generate_insight_from_results(
                question=question,
                sql=current_sql,
                columns=exec_res.columns,
                rows=exec_res.rows,
                row_count=exec_res.row_count,
                llm_client=client,
            )
            final_explanation = insight_res.insight or current_explanation

            return QueryPipelineResult(
                dataset_id=dataset_id,
                question=question,
                sql=current_sql,
                explanation=final_explanation,
                insight=final_explanation,
                chart_type=deterministic_chart_type,
                results=QueryResultsSchema(
                    columns=exec_res.columns,
                    rows=exec_res.rows,
                    row_count=exec_res.row_count,
                    execution_time_ms=exec_res.execution_time_ms,
                ),
                attempts=attempt,
                success=True,
                error_message=None,
            )

        last_error = exec_res.error_message or "Database execution error."
        logger.warning(f"Attempt {attempt} database execution failed: {last_error}")

    return QueryPipelineResult(
        dataset_id=dataset_id,
        question=question,
        sql=current_sql,
        explanation=current_explanation,
        chart_type=current_chart_type,
        attempts=max_attempts,
        success=False,
        error_message=f"Failed to execute query after {max_attempts} attempts. Last error: {last_error}",
    )
