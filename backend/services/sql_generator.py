from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from services.schema_formatter import format_schema_context
from services.llm_service import LLMClient, LLMResponse


class ChartType(str, Enum):
    """Allowed chart visualization types for QueryPilot results."""
    BAR = "bar"
    LINE = "line"
    SCATTER = "scatter"
    PIE = "pie"
    KPI = "kpi"
    TABLE = "table"


class SQLGenerationResult(BaseModel):
    """Structured result returned by the SQL generation service."""
    sql: str = Field(default="", description="Executable read-only DuckDB SQL query")
    explanation: str = Field(default="", description="Concise plain-English explanation of the SQL calculation")
    chart_type: str = Field(default="table", description="Suggested visualization type: bar, line, scatter, pie, kpi, or table")
    success: bool = True
    error_message: Optional[str] = None


class SQLResponseSchema(BaseModel):
    """Schema enforced on LLM structured JSON output."""
    sql: str = Field(description="Read-only analytical SELECT query targeting dataset table")
    explanation: str = Field(description="Brief plain-English explanation of what the query calculates")
    chart_type: ChartType = Field(description="Visualization type: bar, line, scatter, pie, kpi, or table")


SYSTEM_PROMPT = """You are QueryPilot, an expert AI data analyst.
Your task is to translate a user's natural language question into a valid, read-only analytical SQL query for DuckDB based STRICTLY on the provided dataset schema.

CRITICAL INSTRUCTIONS:
1. Generate ONLY read-only SELECT queries. NEVER generate DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, or TRUNCATE.
2. Use ONLY table names and column names present in the provided schema context.
3. If a requested metric (such as 'revenue') is not an explicit column, derive it from existing columns (e.g. quantity * unit_price).
4. Enclose table and column names in double quotes if they contain spaces, hyphens, or special characters.
5. Apply a reasonable LIMIT (maximum 10000 rows) unless an aggregation (COUNT, SUM, AVG) is used.
6. Provide a concise 1-2 sentence explanation of the generated SQL logic.
7. Recommend a chart_type from: 'bar', 'line', 'scatter', 'pie', 'kpi', or 'table'.
"""


def build_sql_prompt(question: str, schema_info: Dict[str, Any]) -> str:
    """
    Constructs the prompt string combining the schema context and user question.
    """
    schema_text = format_schema_context(schema_info)
    return (
        f"Dataset Schema:\n"
        f"{schema_text}\n\n"
        f"User Question:\n"
        f"{question}\n\n"
        f"Generate the read-only SQL query, explanation, and chart_type recommendation."
    )


def generate_sql_from_question(
    question: str,
    schema_info: Dict[str, Any],
    llm_client: Optional[LLMClient] = None,
) -> SQLGenerationResult:
    """
    Translates a natural language question into structured SQL, explanation, and chart recommendation.
    Enforces strict validation of the LLM response (required non-empty sql, explanation, and allowed chart_type enum).
    Does NOT execute or validate the SQL query against DuckDB.
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

    client = llm_client or LLMClient()
    prompt = build_sql_prompt(question, schema_info)

    response: LLMResponse = client.generate(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        response_schema=SQLResponseSchema,
    )

    if not response.success:
        return SQLGenerationResult(
            success=False,
            error_message=response.error_message or "Failed to generate SQL from LLM.",
        )

    json_data = response.json_data
    if json_data is None:
        return SQLGenerationResult(
            success=False,
            error_message="Model response is malformed or not valid JSON.",
        )

    # 1. Strict Validation: Reject missing or non-string/empty 'sql'
    sql = json_data.get("sql")
    if not isinstance(sql, str) or not sql.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Model response missing required non-empty field 'sql'.",
        )

    # 2. Strict Validation: Reject missing or non-string/empty 'explanation'
    explanation = json_data.get("explanation")
    if not isinstance(explanation, str) or not explanation.strip():
        return SQLGenerationResult(
            success=False,
            error_message="Model response missing required non-empty field 'explanation'.",
        )

    # 3. Strict Validation: Reject missing or invalid 'chart_type' enum value
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
