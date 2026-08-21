import os
import sys
import pytest
import tempfile
from services.query_executor import execute_query, SQLExecutionResult
from db import ingest_csv_to_duckdb, get_table_name, get_dataset_full_schema

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def temp_dataset():
    """Ingests a sample CSV file into a temporary DuckDB database for execution tests."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_executor.duckdb")
    csv_path = os.path.join(temp_dir, "test_sales.csv")

    csv_content = (
        "product,quantity,unit_price,category\n"
        "Laptop,2,1200.00,Electronics\n"
        "Monitor,1,300.00,Electronics\n"
        "Keyboard,5,50.00,Accessories\n"
    )
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write(csv_content)

    dataset_id = "executor-test-dataset-123"
    ingest_csv_to_duckdb(dataset_id, csv_path, db_path=db_path)
    schema_info = get_dataset_full_schema(dataset_id, db_path=db_path)

    yield {
        "dataset_id": dataset_id,
        "table_name": get_table_name(dataset_id),
        "db_path": db_path,
        "schema_info": schema_info,
    }


def test_execute_successful_select(temp_dataset):
    """Test executing a valid SELECT query returns columns, rows, row_count, and latency."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]
    schema_info = temp_dataset["schema_info"]

    sql = f'SELECT product, quantity FROM "{table_name}" ORDER BY quantity DESC;'
    res = execute_query(dataset_id, sql, db_path=db_path, schema_info=schema_info)

    assert res.success is True
    assert res.columns == ["product", "quantity"]
    assert res.row_count == 3
    assert len(res.rows) == 3
    assert res.rows[0] == ["Keyboard", 5]
    assert res.execution_time_ms >= 0.0


def test_execute_aggregation(temp_dataset):
    """Test executing an aggregation SQL query with GROUP BY."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]
    schema_info = temp_dataset["schema_info"]

    sql = f'SELECT category, SUM(quantity * unit_price) AS revenue FROM "{table_name}" GROUP BY category ORDER BY revenue DESC;'
    res = execute_query(dataset_id, sql, db_path=db_path, schema_info=schema_info)

    assert res.success is True
    assert res.columns == ["category", "revenue"]
    assert res.row_count == 2
    assert res.rows[0] == ["Electronics", 2700.00]
    assert res.rows[1] == ["Accessories", 250.00]


def test_execute_invalid_sql_rejected_by_validator(temp_dataset):
    """Test executing a destructive DROP query is rejected by validator gate."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]
    schema_info = temp_dataset["schema_info"]

    sql = f'DROP TABLE "{table_name}";'
    res = execute_query(dataset_id, sql, db_path=db_path, schema_info=schema_info)

    assert res.success is False
    assert "Only read-only SELECT queries are allowed" in res.error_message


def test_execute_database_error_handling(temp_dataset):
    """Test catching DuckDB database syntax/type runtime errors cleanly."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]
    schema_info = temp_dataset["schema_info"]

    # Invalid type cast runtime error in DuckDB
    sql = f'SELECT product, CAST(product AS INTEGER) FROM "{table_name}";'
    res = execute_query(dataset_id, sql, db_path=db_path, schema_info=schema_info)

    assert res.success is False
    assert "Database Execution Error" in res.error_message or "Could not convert" in res.error_message


def test_execute_empty_result(temp_dataset):
    """Test executing a query that returns 0 matching rows."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]
    schema_info = temp_dataset["schema_info"]

    sql = f'SELECT * FROM "{table_name}" WHERE quantity > 9999;'
    res = execute_query(dataset_id, sql, db_path=db_path, schema_info=schema_info)

    assert res.success is True
    assert len(res.columns) == 4
    assert res.rows == []
    assert res.row_count == 0
