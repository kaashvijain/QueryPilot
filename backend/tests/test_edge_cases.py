import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.llm_service import LLMResponse
from services.sql_validator import validate_sql_query
from services.query_executor import execute_query

client = TestClient(app)


@pytest.fixture(autouse=True)
def use_isolated_db(monkeypatch, tmp_path):
    """Isolates DuckDB file per test execution."""
    test_db = str(tmp_path / "test_edge_cases.duckdb")
    monkeypatch.setattr("db.DEFAULT_DB_PATH", test_db)


def test_edge_case_special_column_names():
    """
    Edge Case 1: Column names with spaces, hyphens, and special characters.
    Headers: Product Name, Unit Cost ($), Order-Date, User #
    """
    csv_content = '"Product Name","Unit Cost ($)","Order-Date","User #"\n"Laptop $1000",999.99,"2025-01-01",#101\n'
    files = {"file": ("special_headers.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]

    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    assert schema_res.status_code == 200
    table_name = schema_res.json()["table_name"]

    # Verify SQL validator and query executor handle double-quoted special column names
    sql = f'SELECT "Product Name", "Unit Cost ($)" AS price FROM "{table_name}" WHERE "User #" = \'#101\''
    mock_llm_response = LLMResponse(
        text=f'{{"sql": "{sql}", "explanation": "Test special headers.", "chart_type": "bar"}}',
        json_data={"sql": sql, "explanation": "Test special headers.", "chart_type": "bar"},
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "Show price for Laptop $1000",
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["results"]["columns"] == ["Product Name", "price"]
        assert data["results"]["rows"][0] == ["Laptop $1000", 999.99]


def test_edge_case_null_values_in_dataset():
    """
    Edge Case 2: Datasets with NULL / missing values in columns.
    """
    csv_content = "product,quantity,sales\nLaptop,2,2000\nMonitor,,500\nKeyboard,5,\n"
    files = {"file": ("nulls.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]

    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    table_name = schema_res.json()["table_name"]

    # Aggregation functions (SUM, AVG, COUNT) handling NULLs in DuckDB
    sql = f'SELECT COUNT(quantity) AS cnt_qty, SUM(sales) AS total_sales, AVG(quantity) AS avg_qty FROM "{table_name}"'
    mock_llm_response = LLMResponse(
        text=f'{{"sql": "{sql}", "explanation": "Test NULL aggregations.", "chart_type": "kpi"}}',
        json_data={"sql": sql, "explanation": "Test NULL aggregations.", "chart_type": "kpi"},
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "What is total sales and average quantity?",
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["results"]["columns"] == ["cnt_qty", "total_sales", "avg_qty"]
        assert data["results"]["rows"][0][0] == 2  # COUNT ignores NULLs
        assert data["results"]["rows"][0][1] == 2500.0  # 2000 + 500


def test_edge_case_zero_rows_headers_only():
    """
    Edge Case 3: Zero-row CSV dataset (Headers only).
    DuckDB defaults 0-row text columns to VARCHAR, so queries should use COUNT or CAST for numeric aggregations.
    """
    csv_content = "product,quantity,sales\n"
    files = {"file": ("empty_data.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]
    assert upload_res.json()["row_count"] == 0

    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    table_name = schema_res.json()["table_name"]

    sql = f'SELECT product, COUNT(sales) AS total_count FROM "{table_name}" GROUP BY product'
    mock_llm_response = LLMResponse(
        text=f'{{"sql": "{sql}", "explanation": "Test empty data count.", "chart_type": "table"}}',
        json_data={"sql": sql, "explanation": "Test empty data count.", "chart_type": "table"},
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "What is the count of products?",
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["results"]["columns"] == ["product", "total_count"]
        assert data["results"]["rows"] == []
        assert data["results"]["row_count"] == 0


def test_edge_case_case_insensitive_columns():
    """
    Edge Case 4: Schema column is Product_Category, query uses lowercase or uppercase variations.
    """
    schema_info = {
        "table_name": "dataset_sales",
        "columns": [{"name": "Product_Category", "type": "VARCHAR"}, {"name": "Total_Sales", "type": "DOUBLE"}],
    }

    # Validator permits unquoted lower/upper case variations of column names
    sql = 'SELECT product_category, SUM(total_sales) AS total FROM dataset_sales GROUP BY product_category'
    val_res = validate_sql_query(sql, schema_info=schema_info)
    assert val_res.valid is True
    assert val_res.reason is None


def test_edge_case_verbose_question_with_special_chars():
    """
    Edge Case 5: Extremely long user question containing quotes, semicolons, linebreaks, and special symbols.
    """
    verbose_question = (
        'Can you please analyze dataset "sales.csv"; find top 5 items where category = \'Electronics\'\n'
        'and return total revenue? Note: Ignore items with quantity <= 0! ' + ("words " * 100)
    )

    csv_content = "category,product,sales\nElectronics,Laptop,1000\n"
    files = {"file": ("sales.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    dataset_id = upload_res.json()["dataset_id"]
    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    table_name = schema_res.json()["table_name"]

    sql = f'SELECT product, SUM(sales) AS total FROM "{table_name}" WHERE category = \'Electronics\' GROUP BY product'
    mock_llm_response = LLMResponse(
        text=f'{{"sql": "{sql}", "explanation": "Handled verbose input.", "chart_type": "bar"}}',
        json_data={"sql": sql, "explanation": "Handled verbose input.", "chart_type": "bar"},
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": verbose_question,
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["results"]["row_count"] == 1
        assert data["results"]["rows"][0] == ["Laptop", 1000.0]
