import os
import sys
import pytest

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.sql_validator import validate_sql_query, SQLValidationResult


@pytest.fixture
def sample_schema():
    return {
        "dataset_id": "abc-123-uuid",
        "table_name": "dataset_sales",
        "row_count": 84392,
        "columns": [
            {"name": "product", "type": "VARCHAR"},
            {"name": "quantity", "type": "INTEGER"},
            {"name": "unit_price", "type": "DOUBLE"},
            {"name": "order_date", "type": "DATE"},
        ],
    }


def test_validate_valid_select():
    """Test valid SELECT query passes validation without schema."""
    sql = 'SELECT "product", SUM("quantity") AS "total" FROM "dataset_sales" GROUP BY "product";'
    res = validate_sql_query(sql)

    assert res.valid is True
    assert res.reason is None


def test_validate_valid_with_cte():
    """Test valid WITH CTE query passes validation."""
    sql = 'WITH top_products AS (SELECT product, SUM(quantity) as total FROM sales GROUP BY product) SELECT * FROM top_products LIMIT 10'
    res = validate_sql_query(sql)

    assert res.valid is True
    assert res.reason is None


def test_validate_reject_drop():
    """Test rejecting DROP statement."""
    sql = 'DROP TABLE dataset_sales;'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_delete():
    """Test rejecting DELETE statement."""
    sql = 'DELETE FROM dataset_sales WHERE 1=1'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_insert():
    """Test rejecting INSERT statement."""
    sql = 'INSERT INTO dataset_sales VALUES (1, "Product", 100)'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_update():
    """Test rejecting UPDATE statement."""
    sql = 'UPDATE dataset_sales SET sales = 0 WHERE product = "Laptop"'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_alter():
    """Test rejecting ALTER statement."""
    sql = 'ALTER TABLE dataset_sales DROP COLUMN sales'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_create():
    """Test rejecting CREATE statement."""
    sql = 'CREATE TABLE new_table AS SELECT * FROM dataset_sales'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_truncate():
    """Test rejecting TRUNCATE statement."""
    sql = 'TRUNCATE dataset_sales'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Only read-only SELECT queries are allowed" in res.reason


def test_validate_reject_multiple_statements():
    """Test rejecting multi-statement queries separated by semicolons."""
    sql = 'SELECT * FROM dataset_sales; DROP TABLE dataset_sales;'
    res = validate_sql_query(sql)

    assert res.valid is False
    assert "Multiple SQL statements are not allowed" in res.reason


def test_validate_string_literal_with_forbidden_word():
    """Test string literals matching forbidden words do not cause false positives."""
    sql = "SELECT * FROM dataset_sales WHERE category = 'DROP' OR action = 'DELETE'"
    res = validate_sql_query(sql)

    assert res.valid is True
    assert res.reason is None


def test_validate_empty_sql():
    """Test rejecting empty or whitespace-only SQL strings."""
    assert validate_sql_query("").valid is False
    assert validate_sql_query("   ").valid is False
    assert validate_sql_query("-- only comments\n").valid is False


def test_validate_with_schema_valid(sample_schema):
    """Test valid query matching table and column schema passes validation."""
    sql = 'SELECT product, SUM(quantity * unit_price) AS revenue FROM dataset_sales GROUP BY product ORDER BY revenue DESC LIMIT 5;'
    res = validate_sql_query(sql, schema_info=sample_schema)

    assert res.valid is True
    assert res.reason is None


def test_validate_with_schema_invalid_table(sample_schema):
    """Test rejecting query referencing a nonexistent table name."""
    sql = 'SELECT product FROM nonexistent_table'
    res = validate_sql_query(sql, schema_info=sample_schema)

    assert res.valid is False
    assert "Referenced table 'nonexistent_table' does not exist in schema" in res.reason


def test_validate_with_schema_invalid_column_unquoted(sample_schema):
    """Test rejecting query referencing a nonexistent unquoted column."""
    sql = 'SELECT product, nonexistent_column FROM dataset_sales'
    res = validate_sql_query(sql, schema_info=sample_schema)

    assert res.valid is False
    assert "Referenced column 'nonexistent_column' does not exist in schema" in res.reason


def test_validate_with_schema_invalid_column_quoted(sample_schema):
    """Test rejecting query referencing a nonexistent double-quoted column."""
    sql = 'SELECT "product", "Invalid Column" FROM "dataset_sales"'
    res = validate_sql_query(sql, schema_info=sample_schema)

    assert res.valid is False
    assert "Referenced column 'Invalid Column' does not exist in schema" in res.reason
