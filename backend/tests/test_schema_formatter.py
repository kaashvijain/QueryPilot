import os
import sys
import pytest

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.schema_formatter import format_schema_context


def test_format_schema_context_standard():
    """Test formatting a standard dataset schema into a text prompt representation."""
    schema_data = {
        "dataset_id": "abc123_uuid",
        "table_name": "sales",
        "row_count": 84392,
        "columns": [
            {"name": "product", "type": "VARCHAR"},
            {"name": "quantity", "type": "INTEGER"},
            {"name": "unit_price", "type": "DOUBLE"},
            {"name": "order_date", "type": "DATE"},
        ],
    }

    result = format_schema_context(schema_data)

    expected = (
        "Table: sales\n"
        "Rows: 84392\n\n"
        "Columns:\n"
        "- product: VARCHAR\n"
        "- quantity: INTEGER\n"
        "- unit_price: DOUBLE\n"
        "- order_date: DATE"
    )

    assert result == expected


def test_format_schema_context_custom_table_name():
    """Test overriding display table name."""
    schema_data = {
        "table_name": "dataset_c72aba1a_a0e1_4e18_9d95_b402b08e5ae1",
        "row_count": 100,
        "columns": [{"name": "id", "type": "INTEGER"}],
    }

    result = format_schema_context(schema_data, display_table_name="sales_data")

    assert "Table: sales_data" in result
    assert "Rows: 100" in result
    assert "- id: INTEGER" in result


def test_format_schema_context_empty_or_missing_keys():
    """Test handling schema data with missing fields or empty columns list."""
    empty_schema = {}
    result = format_schema_context(empty_schema)

    assert "Table: sales" in result
    assert "Rows: 0" in result
    assert "- (No columns found)" in result
