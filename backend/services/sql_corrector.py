from typing import Dict, Any, Optional
from services.schema_formatter import format_schema_context
from services.llm_service import LLMClient, LLMResponse
from services.sql_generator import SQLGenerationResult, SQLResponseSchema, ChartType

CORRECTION_SYSTEM_PROMPT = """You are QueryPilot, an expert AI data analyst specializing in SQL query correction.
Your task is to fix a failed DuckDB SQL query based on the provided database error message and dataset schema context.

CRITICAL INSTRUCTIONS:
1. Generate ONLY read-only SELECT queries. NEVER generate DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, or TRUNCATE.
2. Use ONLY table names and column names present in the provided dataset schema.
3. Address the specific database error (e.g. if column 'revenue' does not exist, derive it from existing columns such as quantity * unit_price).
4. Enclose table and column names in double quotes if they contain spaces, hyphens, or special characters.
5. Provide a corrected read-only SQL query, a concise 1-2 sentence explanation of the fix, and a recommended chart_type from: 'bar', 'line', 'scatter', 'pie', 'kpi', or 'table'.
6. Do NOT explain the error in prose alone; return the corrected SQL query in the structured JSON response.
"""


def build_correction_prompt(
    question: str,
    schema_info: Dict[str, Any],
    failed_sql: str,
    error_message: str,
) -> str:
    """
    Constructs the correction prompt incorporating the schema, original question, failed SQL, and error message.
    """
    schema_text = format_schema_context(schema_info)
    return (
        f"Dataset Schema:\n"
        f"{schema_text}\n\n"
        f"Original User Question:\n"
        f"{question}\n\n"
        f"Previously Generated SQL (FAILED):\n"
        f"{failed_sql}\n\n"
        f"Database Error:\n"
        f"{error_message}\n\n"
        f"INSTRUCTION:\n"
        f"The previously generated SQL query failed execution with the database error above.\n"
        f"Generate a corrected read-only SQL query that fixes the error using valid columns/tables from the schema, along with an explanation and chart_type recommendation."
    )


def generate_corrected_sql(
    question: str,
    schema_info: Dict[str, Any],
    failed_sql: str,
    error_message: str,
    llm_client: Optional[LLMClient] = None,
) -> SQLGenerationResult:
    """
    Sends the failed SQL, database error, schema, and original question to the LLM to generate a corrected SQL response.
    Enforces strict validation of the LLM response fields (required non-empty sql, explanation, and allowed chart_type enum).
    Does NOT execute the corrected SQL against DuckDB.
    """
    if not question or not question.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Question cannot be empty.",
        )

    if not schema_info or "table_name" not in schema_info:
        return SQLGenerationResult(
            success=False,
            error_message="Valid dataset schema information is required.",
        )

    if not failed_sql or not failed_sql.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Failed SQL query string cannot be empty.",
        )

    if not error_message or not error_message.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Database error message cannot be empty.",
        )

    client = llm_client or LLMClient()
    prompt = build_correction_prompt(question, schema_info, failed_sql, error_message)

    response: LLMResponse = client.generate(
        prompt=prompt,
        system_instruction=CORRECTION_SYSTEM_PROMPT,
        response_schema=SQLResponseSchema,
    )

    if not response.success:
        return SQLGenerationResult(
            success=False,
            error_message=response.error_message or "Failed to generate corrected SQL from LLM.",
        )

    json_data = response.json_data
    if json_data is None:
        return SQLGenerationResult(
            success=False,
            error_message="Model response is malformed or not valid JSON.",
        )

    # 1. Strict Validation: Required non-empty 'sql'
    sql = json_data.get("sql")
    if not isinstance(sql, str) or not sql.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Model response missing required non-empty field 'sql'.",
        )

    # 2. Strict Validation: Required non-empty 'explanation'
    explanation = json_data.get("explanation")
    if not isinstance(explanation, str) or not explanation.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Model response missing required non-empty field 'explanation'.",
        )

    # 3. Strict Validation: Required allowed 'chart_type' enum
    chart_type_raw = json_data.get("chart_type")
    if not isinstance(chart_type_raw, str) or not chart_type_raw.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Model response missing required field 'chart_type'.",
        )

    clean_chart_type = chart_type_raw.strip().lower()
    allowed_types = [c.value for c in ChartType]
    if clean_chart_type not in allowed_types:
        return SQLGenerationResult(
            success=False,
            error_message=f"Invalid chart_type '{chart_type_raw}'. Allowed values: {', '.join(allowed_types)}.",
        )

    return SQLGenerationResult(
        sql=sql.strip(),
        explanation=explanation.strip(),
        chart_type=clean_chart_type,
        success=True,
    )
