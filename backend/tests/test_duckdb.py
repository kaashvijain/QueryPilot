import os
import sys
import tempfile
import shutil
import pytest

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import (
    ingest_csv_to_duckdb,
    get_table_name,
    get_dataset_columns,
    get_dataset_row_count,
    query_dataset,
)


@pytest.fixture
def temp_csv_file():
    """Creates a temporary sample CSV file for DuckDB unit testing."""
    content = (
        "order_id,product_name,category,quantity,unit_price,order_date\n"
        "1001,Laptop,Electronics,2,1200.50,2025-01-15\n"
        "1002,Monitor,Electronics,1,300.00,2025-01-16\n"
        "1003,Desk Chair,Furniture,4,150.25,2025-01-17\n"
        "1004,Coffee Maker,Appliances,1,85.00,2025-01-18\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8") as f:
        f.write(content)
        temp_path = f.name
    
    yield temp_path
    
    if os.path.exists(temp_path):
        os.remove(temp_path)


@pytest.fixture
def temp_db_file():
    """Creates a path for a temporary DuckDB database file for unit testing."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_querypilot.duckdb")
        
    yield db_path
    
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_csv_loaded_successfully_into_duckdb(temp_csv_file, temp_db_file):
    """Verifies CSV is loaded into DuckDB as an isolated, unique table."""
    dataset_id = "test-uuid-12345"
    expected_table_name = get_table_name(dataset_id)
    assert expected_table_name == "dataset_test_uuid_12345"

    result = ingest_csv_to_duckdb(dataset_id, temp_csv_file, db_path=temp_db_file)

    assert result["table_name"] == expected_table_name
    assert result["row_count"] == 4
    assert len(result["columns"]) == 6


def test_duckdb_row_count_matches_source_csv(temp_csv_file, temp_db_file):
    """Verifies DuckDB row count matches the number of data rows in source CSV."""
    dataset_id = "row-count-check-999"
    ingest_csv_to_duckdb(dataset_id, temp_csv_file, db_path=temp_db_file)

    duckdb_count = get_dataset_row_count(dataset_id, db_path=temp_db_file)
    assert duckdb_count == 4


def test_duckdb_columns_and_query_accessibility(temp_csv_file, temp_db_file):
    """Verifies column names, inferred data types, and SQL queries against DuckDB table."""
    dataset_id = "query-access-888"
    ingest_result = ingest_csv_to_duckdb(dataset_id, temp_csv_file, db_path=temp_db_file)

    # Check preserved column names & inferred DuckDB types
    columns = get_dataset_columns(dataset_id, db_path=temp_db_file)
    col_dict = {col["name"]: col["type"] for col in columns}

    assert "order_id" in col_dict
    assert "product_name" in col_dict
    assert "quantity" in col_dict
    assert "unit_price" in col_dict
    assert "order_date" in col_dict

    # Execute SQL SELECT query through DuckDB helper
    table_name = get_table_name(dataset_id)
    sql = f'SELECT product_name, quantity, unit_price FROM "{table_name}" WHERE category = \'Electronics\' ORDER BY unit_price DESC'
    query_result = query_dataset(dataset_id, sql, db_path=temp_db_file)

    assert query_result["columns"] == ["product_name", "quantity", "unit_price"]
    assert len(query_result["rows"]) == 2
    assert query_result["rows"][0] == ["Laptop", 2, 1200.50]
    assert query_result["rows"][1] == ["Monitor", 1, 300.00]
