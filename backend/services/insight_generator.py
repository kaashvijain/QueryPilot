import json
import logging
from typing import List, Any, Optional
from pydantic import BaseModel, Field
from services.llm_service import LLMClient

logger = logging.getLogger("querypilot.insight_generator")


class InsightSchema(BaseModel):
    """Pydantic schema for structured insight LLM output."""
    insight: str = Field(
        ...,
        description="A concise, 1-2 sentence data-grounded business insight summarizing the query results.",
    )


class InsightResult(BaseModel):
    """Result object returned by generate_insight_from_results."""
    insight: str
    success: bool = True
    error_message: Optional[str] = None


INSIGHT_SYSTEM_INSTRUCTION = """
You are QueryPilot's Data Insights Analyst.
Your task is to provide a concise, natural-language explanation of database query results.

CRITICAL GROUNDING RULES:
1. Base your insight EXCLUSIVELY on the provided query results data.
2. DO NOT invent external facts, assumptions, or numbers outside the dataset.
3. Keep the insight concise (1 to 2 sentences maximum).
4. Highlight key figures, top values, totals, or notable comparisons.
5. Return valid JSON matching the requested schema.
""".strip()


def generate_insight_from_results(
    question: str,
    sql: str,
    columns: List[str],
    rows: List[List[Any]],
    row_count: int,
    llm_client: Optional[LLMClient] = None,
) -> InsightResult:
    """
    Generates a concise, data-grounded natural language insight from query results.
    """
    # Safety Guard: Empty or zero-row results
    if row_count == 0 or not columns or not rows:
        return InsightResult(
            insight="No matching records were found in the dataset for this query.",
            success=True,
        )

    # Safety Guard: Single numeric KPI result
    if row_count == 1 and len(columns) <= 2:
        val = rows[0][-1]
        formatted_val = f"{val:,.2f}" if isinstance(val, (int, float)) else str(val)
        col_name = columns[-1].replace("_", " ").title()
        return InsightResult(
            insight=f"Calculated {col_name} of {formatted_val} across the dataset.",
            success=True,
        )

    client = llm_client or LLMClient()

    # Format sample rows (up to top 15 rows to fit prompt context efficiently)
    sample_rows = rows[:15]
    formatted_data = {
        "columns": columns,
        "sample_rows": sample_rows,
        "total_rows": row_count,
    }

    user_prompt = f"""
User Question: "{question}"

Executed SQL Query:
{sql}

Query Results Dataset:
{json.dumps(formatted_data, default=str, indent=2)}

Provide a concise, 1 to 2 sentence analytical insight grounded strictly in these results.
""".strip()

    try:
        response = client.generate(
            prompt=user_prompt,
            system_instruction=INSIGHT_SYSTEM_INSTRUCTION,
            response_schema=InsightSchema,
        )

        if response.success and response.json_data:
            if "insight" in response.json_data and isinstance(response.json_data["insight"], str):
                insight_text = response.json_data["insight"].strip()
                if insight_text:
                    return InsightResult(insight=insight_text, success=True)
            if "explanation" in response.json_data and isinstance(response.json_data["explanation"], str):
                exp_text = response.json_data["explanation"].strip()
                if exp_text:
                    return InsightResult(insight=exp_text, success=True)

        if response.text and response.text.strip():
            # Avoid using raw JSON string if it contains "sql"
            if "{" in response.text and "sql" in response.text:
                pass
            else:
                return InsightResult(insight=response.text.strip(), success=True)

    except Exception as exc:
        logger.error(f"Error generating insight: {str(exc)}")

    # Fallback insight generation if LLM fails
    first_col = columns[0]
    last_col = columns[-1]
    top_label = rows[0][0]
    top_val = rows[0][-1]
    fallback_text = (
        f"The query returned {row_count} rows. "
        f"Highest {last_col} is {top_val} for {top_label}."
    )
    return InsightResult(insight=fallback_text, success=True)
