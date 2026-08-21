import time
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from db import get_db_connection
from services.sql_validator import validate_sql_query

logger = logging.getLogger("querypilot.query_executor")


class SQLExecutionResult(BaseModel):
    """Structured response returned by the DuckDB query execution service."""
    columns: List[str] = Field(default_factory=list, description="List of result column headers")
    rows: List[List[Any]] = Field(default_factory=list, description="List of result data rows")
    row_count: int = Field(default=0, description="Total number of rows returned")
    execution_time_ms: float = Field(default=0.0, description="Query execution duration in milliseconds")
    success: bool = Field(default=True, description="True if query executed successfully")
    error_message: Optional[str] = Field(default=None, description="Detailed error message if query failed")


def execute_query(
    dataset_id: str,
    sql: str,
    db_path: Optional[str] = None,
    schema_info: Optional[Dict[str, Any]] = None,
) -> SQLExecutionResult:
    """
    Executes a validated read-only SQL query against DuckDB and measures execution latency.
    
    1. Runs static validation with validate_sql_query. Rejects unvalidated or harmful SQL.
    2. Connects to DuckDB with read_only=True.
    3. Measures execution latency in milliseconds.
    4. Returns columns, rows, row_count, execution_time_ms, and status.
    5. Catches database execution errors cleanly without calling an LLM or attempting self-correction.
    """
    if not sql or not sql.strip():
        return SQLExecutionResult(
            success=False,
            error_message="SQL query string cannot be empty.",
        )

    # 1. Validation Gate
    validation = validate_sql_query(sql, schema_info=schema_info)
    if not validation.valid:
        return SQLExecutionResult(
            success=False,
            error_message=validation.reason or "SQL query validation failed.",
        )

    # 2. Execute Query & Measure Latency
    start_time = time.perf_counter()
    try:
        conn = get_db_connection(db_path, read_only=True)
        # Enforce 10s query timeout limit to prevent long-running hanging operations
        try:
            conn.execute("SET max_execution_time = '10s';")
        except Exception:
            pass
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Database connection error for dataset '{dataset_id}': {exc}", exc_info=True)
        return SQLExecutionResult(
            success=False,
            error_message="Database connection error. Please verify dataset session.",
            execution_time_ms=duration_ms,
        )

    try:
        res = conn.execute(sql)
        columns = [desc[0] for desc in res.description] if res.description else []
        fetched_rows = res.fetchall()
        rows = [list(r) for r in fetched_rows]
        row_count = len(rows)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return SQLExecutionResult(
            columns=columns,
            rows=rows,
            row_count=row_count,
            execution_time_ms=duration_ms,
            success=True,
        )

    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        err_str = str(exc)
        logger.error(f"DuckDB Execution Error for query [{sql}]: {err_str}", exc_info=True)
        
        if "Timeout" in err_str or "max_execution_time" in err_str or "interrupt" in err_str.lower():
            clean_msg = "Query execution timed out (exceeded 10s limit). Please try a more specific question."
        else:
            clean_msg = err_str

        return SQLExecutionResult(
            success=False,
            error_message=clean_msg,
            execution_time_ms=duration_ms,
        )
    finally:
        conn.close()
