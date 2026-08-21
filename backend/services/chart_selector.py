import re
from typing import List, Any
from enum import Enum


class ColumnType(str, Enum):
    NUMERIC = "NUMERIC"
    DATE = "DATE"
    CATEGORICAL = "CATEGORICAL"


DATE_PATTERNS = [
    re.compile(r"^\d{4}-\d{2}-\d{2}$"),  # 2025-01-01
    re.compile(r"^\d{4}/\d{2}/\d{2}$"),  # 2025/01/01
    re.compile(r"^\d{4}-\d{2}$"),        # 2025-01
    re.compile(r"^\d{4}$"),              # 2025
    re.compile(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}"),  # ISO timestamp
]

DATE_KEYWORDS = {"date", "time", "year", "month", "day", "timestamp", "quarter"}


def _infer_value_type(val: Any, col_name: str) -> ColumnType:
    """Infers the data type of an individual non-null value."""
    if val is None:
        return ColumnType.CATEGORICAL

    # Boolean is categorical
    if isinstance(val, bool):
        return ColumnType.CATEGORICAL

    # Numbers
    if isinstance(val, (int, float)):
        return ColumnType.NUMERIC

    # Strings
    if isinstance(val, str):
        val_str = val.strip()

        # Numeric string check
        try:
            float(val_str)
            return ColumnType.NUMERIC
        except ValueError:
            pass

        # Date pattern check
        for pattern in DATE_PATTERNS:
            if pattern.match(val_str):
                return ColumnType.DATE

    return ColumnType.CATEGORICAL


def infer_column_types(columns: List[str], rows: List[List[Any]]) -> List[ColumnType]:
    """
    Infers ColumnType for each column in the query results based on column name and cell values.
    """
    col_types: List[ColumnType] = []

    for col_idx, col_name in enumerate(columns):
        clean_col_name = col_name.lower().strip()

        # Name hint for dates
        is_date_named = any(kw in clean_col_name for kw in DATE_KEYWORDS)

        # Inspect non-null cell values (up to 50 sample rows)
        sample_rows = rows[:50]
        numeric_count = 0
        date_count = 0
        total_sample_count = 0

        for row in sample_rows:
            if col_idx < len(row):
                cell = row[col_idx]
                if cell is not None:
                    total_sample_count += 1
                    t = _infer_value_type(cell, col_name)
                    if t == ColumnType.NUMERIC:
                        numeric_count += 1
                    elif t == ColumnType.DATE:
                        date_count += 1

        if total_sample_count == 0:
            # Empty column or all nulls
            if is_date_named:
                col_types.append(ColumnType.DATE)
            else:
                col_types.append(ColumnType.CATEGORICAL)
            continue

        numeric_ratio = numeric_count / total_sample_count
        date_ratio = date_count / total_sample_count

        if numeric_ratio >= 0.8:
            col_types.append(ColumnType.NUMERIC)
        elif date_ratio >= 0.5 or (is_date_named and (date_count > 0 or numeric_ratio < 0.5)):
            col_types.append(ColumnType.DATE)
        else:
            col_types.append(ColumnType.CATEGORICAL)

    return col_types


def select_visualization(columns: List[str], rows: List[List[Any]], row_count: int) -> str:
    """
    Deterministic rule-based visualization selector.
    Returns one of: 'bar', 'line', 'scatter', 'pie', 'kpi', 'table'

    Rules:
    1. 'table' if row_count == 0 or empty columns
    2. 'kpi' if row_count == 1 and num_cols <= 2 with numeric metric
    3. For 2-column results:
       - 'line' if 1 DATE column and 1 NUMERIC column
       - 'scatter' if 2 NUMERIC columns
       - 'pie' if 1 CATEGORICAL + 1 NUMERIC with 1 < row_count <= 6
       - 'bar' if 1 CATEGORICAL + 1 NUMERIC with row_count > 6
    4. For 3+ column results:
       - 'table' default for multi-column complex/mixed datasets
    """
    if row_count == 0 or not columns or not rows:
        return "table"

    col_types = infer_column_types(columns, rows)
    num_cols = len(columns)

    numeric_indices = [i for i, t in enumerate(col_types) if t == ColumnType.NUMERIC]
    date_indices = [i for i, t in enumerate(col_types) if t == ColumnType.DATE]
    cat_indices = [i for i, t in enumerate(col_types) if t == ColumnType.CATEGORICAL]

    # Rule 1: Single numeric KPI metric (1 row)
    if row_count == 1 and num_cols <= 2 and len(numeric_indices) >= 1 and len(date_indices) == 0:
        return "kpi"

    # Rule 2: 2-column visualizations
    if num_cols == 2:
        # Date + Numeric variable -> line chart
        if len(date_indices) >= 1 and len(numeric_indices) >= 1:
            return "line"
        # Two numeric variables -> scatter plot
        if len(numeric_indices) == 2:
            return "scatter"
        # Category + Numeric variable
        if (len(cat_indices) >= 1 or len(date_indices) >= 1) and len(numeric_indices) >= 1:
            if 1 < row_count <= 6:
                return "pie"
            else:
                return "bar"

    # Rule 3: 3+ columns fallback -> table
    return "table"
