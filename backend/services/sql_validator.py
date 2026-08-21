import re
from typing import Optional
from pydantic import BaseModel, Field


class SQLValidationResult(BaseModel):
    """Structured result returned by the SQL validator."""
    valid: bool = Field(description="True if the query is a valid read-only SELECT query, False otherwise")
    reason: Optional[str] = Field(default=None, description="Explanation if validation failed, None if valid")


FORBIDDEN_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
    "CREATE", "TRUNCATE", "EXEC", "EXECUTE", "PRAGMA", "ATTACH", "COPY"
}


def validate_sql_query(sql: str) -> SQLValidationResult:
    """
    Validates a SQL query string to ensure it is a safe, single, read-only SELECT query.
    Rejects multi-statement queries and destructive keywords (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, TRUNCATE).
    Does NOT execute any queries against DuckDB or call an LLM.
    """
    if not sql or not sql.strip():
        return SQLValidationResult(
            valid=False,
            reason="SQL query cannot be empty.",
        )

    # 1. Strip comments (single-line -- and multi-line /* */)
    cleaned_sql = re.sub(r"--.*", "", sql)
    cleaned_sql = re.sub(r"/\*.*?\*/", "", cleaned_sql, flags=re.DOTALL).strip()

    if not cleaned_sql:
        return SQLValidationResult(
            valid=False,
            reason="SQL query cannot be empty or contain only comments.",
        )

    # 2. Check for multi-statement queries (separated by semicolons)
    # Remove trailing semicolons first
    statement_body = cleaned_sql.rstrip(";").strip()
    if ";" in statement_body:
        return SQLValidationResult(
            valid=False,
            reason="Multiple SQL statements are not allowed.",
        )

    # 3. Verify starting keyword is SELECT or WITH (case-insensitive)
    upper_sql = statement_body.upper()
    if not (upper_sql.startswith("SELECT") or upper_sql.startswith("WITH")):
        return SQLValidationResult(
            valid=False,
            reason="Only read-only SELECT queries are allowed.",
        )

    # 4. Extract word tokens and check for forbidden destructive keywords
    # Ignore text inside single/double quotes to avoid false positives on string literals (e.g. WHERE status = 'DROP')
    unquoted_sql = re.sub(r"'[^']*'", "", statement_body)
    unquoted_sql = re.sub(r'"[^"]*"', "", unquoted_sql)
    
    tokens = set(re.findall(r"\b[A-Za-z_]+\b", unquoted_sql.upper()))
    found_forbidden = tokens.intersection(FORBIDDEN_KEYWORDS)

    if found_forbidden:
        forbidden_list = ", ".join(sorted(found_forbidden))
        return SQLValidationResult(
            valid=False,
            reason=f"Only read-only SELECT queries are allowed. Prohibited operation '{forbidden_list}' detected.",
        )

    return SQLValidationResult(
        valid=True,
        reason=None,
    )
