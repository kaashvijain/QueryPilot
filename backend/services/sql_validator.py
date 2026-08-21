import re
from typing import Optional, Dict, Any, List, Set
from pydantic import BaseModel, Field


class SQLValidationResult(BaseModel):
    """Structured result returned by the SQL validator."""
    valid: bool = Field(description="True if the query is a valid read-only SELECT query, False otherwise")
    reason: Optional[str] = Field(default=None, description="Explanation if validation failed, None if valid")


FORBIDDEN_KEYWORDS: Set[str] = {
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
    "CREATE", "TRUNCATE", "EXEC", "EXECUTE", "PRAGMA", "ATTACH", "COPY",
    "INSTALL", "LOAD", "EXPORT", "IMPORT"
}

STANDARD_SQL_KEYWORDS: Set[str] = {
    "SELECT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
    "AS", "ON", "AND", "OR", "NOT", "IN", "IS", "NULL", "LIKE", "ILIKE", "BETWEEN",
    "ASC", "DESC", "SUM", "COUNT", "AVG", "MIN", "MAX", "CAST", "DATE", "YEAR",
    "MONTH", "DAY", "INTERVAL", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS",
    "USING", "UNION", "ALL", "DISTINCT", "TRUE", "FALSE", "CASE", "WHEN", "THEN",
    "ELSE", "END", "COALESCE", "ROUND", "FLOOR", "CEIL", "ABS", "STRING_AGG",
    "CONCAT", "SUBSTRING", "CURRENT_DATE", "CURRENT_TIMESTAMP", "EXTRACT"
}


def validate_sql_query(sql: str, schema_info: Optional[Dict[str, Any]] = None) -> SQLValidationResult:
    """
    Validates a SQL query string.
    1. Ensures it is a single, safe, read-only SELECT or WITH (CTE) query.
    2. Rejects multi-statement queries and destructive operations (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, TRUNCATE).
    3. If schema_info is provided:
       - Verifies that referenced table(s) exist in the schema.
       - Verifies that referenced columns exist in the schema (ignoring aliases and SQL keywords).
    4. Does NOT execute any queries against DuckDB or call an LLM.
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

    # 5. Schema-aware Validation (Table & Column verification)
    if schema_info:
        schema_validation = _validate_tables_and_columns(statement_body, schema_info)
        if not schema_validation.valid:
            return schema_validation

    return SQLValidationResult(
        valid=True,
        reason=None,
    )


def _validate_tables_and_columns(sql: str, schema_info: Dict[str, Any]) -> SQLValidationResult:
    """Helper function to verify table and column references against dataset schema."""
    table_name = schema_info.get("table_name", "").strip()
    dataset_id = schema_info.get("dataset_id", "").strip()
    
    valid_tables: Set[str] = set()
    if table_name:
        valid_tables.add(table_name.lower())
    if dataset_id:
        valid_tables.add(dataset_id.lower())

    columns_list = schema_info.get("columns", [])
    valid_columns: Set[str] = {
        col["name"].strip().lower() for col in columns_list if isinstance(col, dict) and "name" in col
    }

    # Extract declared CTE names (e.g., WITH cte_name AS (...))
    cte_names: Set[str] = set()
    for match in re.finditer(r"\bWITH\s+(?:\"([^\"]+)\"|([A-Za-z0-9_]+))\s+AS", sql, re.IGNORECASE):
        cte_name = match.group(1) or match.group(2)
        if cte_name:
            cte_names.add(cte_name.lower())

    # Extract table references following FROM or JOIN
    table_pattern = r"\b(?:FROM|JOIN)\s+(?:\"([^\"]+)\"|([A-Za-z0-9_]+))"
    for match in re.finditer(table_pattern, sql, re.IGNORECASE):
        ref_table = match.group(1) or match.group(2)
        if not ref_table:
            continue
        clean_table = ref_table.strip().lower()
        if clean_table not in valid_tables and clean_table not in cte_names:
            return SQLValidationResult(
                valid=False,
                reason=f"Referenced table '{ref_table}' does not exist in schema.",
            )

    # Extract declared column aliases following AS (e.g. AS revenue or AS "Total Sales")
    declared_aliases: Set[str] = set()
    alias_pattern = r"\bAS\s+(?:\"([^\"]+)\"|([A-Za-z0-9_]+))"
    for match in re.finditer(alias_pattern, sql, re.IGNORECASE):
        alias = match.group(1) or match.group(2)
        if alias:
            declared_aliases.add(alias.strip().lower())

    # Check double-quoted column identifiers (e.g., "Product Name", "Sales")
    quoted_pattern = r"\"([^\"]+)\""
    for match in re.finditer(quoted_pattern, sql):
        quoted_identifier = match.group(1).strip()
        quoted_lower = quoted_identifier.lower()
        
        # Skip if it matches table name, CTE name, or declared column alias
        if quoted_lower in valid_tables or quoted_lower in cte_names or quoted_lower in declared_aliases:
            continue

        if valid_columns and quoted_lower not in valid_columns:
            return SQLValidationResult(
                valid=False,
                reason=f"Referenced column '{quoted_identifier}' does not exist in schema.",
            )

    # Check unquoted column word tokens
    unquoted = re.sub(r"'[^']*'", "", sql)
    unquoted = re.sub(r'"[^"]*"', "", unquoted)
    
    word_tokens = re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", unquoted)
    for token in word_tokens:
        tok_upper = token.upper()
        tok_lower = token.lower()

        # Skip SQL keywords, numbers, table names, CTE names, declared aliases, or valid columns
        if (
            tok_upper in STANDARD_SQL_KEYWORDS
            or tok_upper in FORBIDDEN_KEYWORDS
            or tok_lower in valid_tables
            or tok_lower in cte_names
            or tok_lower in declared_aliases
            or tok_lower in valid_columns
        ):
            continue

        # If an unquoted token isn't a keyword/table/alias/valid column, reject
        if valid_columns:
            return SQLValidationResult(
                valid=False,
                reason=f"Referenced column '{token}' does not exist in schema.",
            )

    return SQLValidationResult(
        valid=True,
        reason=None,
    )
