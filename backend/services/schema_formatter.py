from typing import Dict, Any, Optional


def format_schema_context(schema_data: Dict[str, Any], display_table_name: Optional[str] = None) -> str:
    """
    Formats structured dataset schema metadata into a concise text representation suitable for LLM prompts.
    
    Args:
        schema_data: Dictionary containing table schema details (table_name, row_count, columns).
        display_table_name: Optional alias or explicit table name to use instead of schema_data['table_name'].

    Returns:
        Formatted string containing Table name, Rows count, and bulleted Columns list with types.
    """
    table_name = display_table_name or schema_data.get("table_name", "sales")
    row_count = schema_data.get("row_count", 0)
    columns = schema_data.get("columns", [])

    column_lines = [
        f"- {col['name']}: {col['type']}"
        for col in columns
        if isinstance(col, dict) and "name" in col and "type" in col
    ]
    columns_formatted = "\n".join(column_lines) if column_lines else "- (No columns found)"

    return f"Table: {table_name}\nRows: {row_count}\n\nColumns:\n{columns_formatted}"
