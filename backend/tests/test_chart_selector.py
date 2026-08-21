import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.chart_selector import select_visualization, infer_column_types, ColumnType


def test_chart_selector_kpi():
    """Single numeric value (1 row, 1 numeric column or 1 row aggregate) -> kpi."""
    columns = ["total_revenue"]
    rows = [[2400000.0]]
    chart_type = select_visualization(columns, rows, row_count=1)
    assert chart_type == "kpi"


def test_chart_selector_line():
    """Date + Numeric variable -> line chart."""
    columns = ["order_date", "sales"]
    rows = [
        ["2025-01-01", 100.0],
        ["2025-01-02", 250.0],
        ["2025-01-03", 400.0],
    ]
    chart_type = select_visualization(columns, rows, row_count=3)
    assert chart_type == "line"


def test_chart_selector_scatter():
    """Two numeric variables -> scatter plot."""
    columns = ["quantity", "unit_price"]
    rows = [
        [5, 99.99],
        [10, 49.99],
        [2, 199.99],
        [15, 29.99],
    ]
    chart_type = select_visualization(columns, rows, row_count=4)
    assert chart_type == "scatter"


def test_chart_selector_pie():
    """Categorical + Numeric variable with <= 6 rows -> pie chart."""
    columns = ["category", "sales"]
    rows = [
        ["Electronics", 5000],
        ["Furniture", 3000],
        ["Office Supplies", 2000],
    ]
    chart_type = select_visualization(columns, rows, row_count=3)
    assert chart_type == "pie"


def test_chart_selector_bar():
    """Categorical + Numeric variable with > 6 rows -> bar chart."""
    columns = ["product", "revenue"]
    rows = [[f"Product_{i}", 1000 * i] for i in range(1, 10)]  # 9 rows
    chart_type = select_visualization(columns, rows, row_count=9)
    assert chart_type == "bar"


def test_chart_selector_table_zero_rows():
    """Zero rows -> table."""
    columns = ["product", "revenue"]
    rows = []
    chart_type = select_visualization(columns, rows, row_count=0)
    assert chart_type == "table"


def test_chart_selector_table_complex_mixed_data():
    """3+ complex/mixed columns -> table."""
    columns = ["product_id", "product_name", "category", "sales", "order_date"]
    rows = [
        [101, "Laptop", "Electronics", 1200.0, "2025-01-01"],
        [102, "Chair", "Furniture", 150.0, "2025-01-02"],
    ]
    chart_type = select_visualization(columns, rows, row_count=2)
    assert chart_type == "table"


def test_infer_column_types_helper():
    """Verifies column type inference for dates, numbers, and strings."""
    columns = ["Order Date", "Price ($)", "Product Name"]
    rows = [
        ["2025-05-15", 99.9, "Keyboard"],
        ["2025-05-16", 149.5, "Mouse"],
    ]
    types = infer_column_types(columns, rows)
    assert types == [ColumnType.DATE, ColumnType.NUMERIC, ColumnType.CATEGORICAL]
