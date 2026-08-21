import os
import sys
import pytest

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.sql_validator import validate_sql_query, SQLValidationResult


def test_validate_valid_select():
    """Test valid SELECT query passes validation."""
    sql = 'SELECT "Product Name", SUM("Sales") AS "Total Revenue" FROM "dataset_sales" GROUP BY "Product Name" ORDER BY "Total Revenue" DESC LIMIT 5;'
    res = validate_sql_query(sql)

    assert res.valid is True
    assert res.reason is None


def test_validate_valid_with_cte():
    """Test valid WITH CTE query passes validation."""
    sql = 'WITH top_products AS (SELECT product, SUM(sales) as total FROM sales GROUP BY product) SELECT * FROM top_products LIMIT 10'
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
    """Test string literals matching forbidden words (e.g. category = 'DROP') do not cause false positives."""
    sql = "SELECT * FROM dataset_sales WHERE category = 'DROP' OR action = 'DELETE'"
    res = validate_sql_query(sql)

    assert res.valid is True
    assert res.reason is None


def test_validate_empty_sql():
    """Test rejecting empty or whitespace-only SQL strings."""
    assert validate_sql_query("").valid is False
    assert validate_sql_query("   ").valid is False
    assert validate_sql_query("-- only comments\n").valid is False
