import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.llm_service import LLMResponse

client = TestClient(app)


@pytest.fixture(autouse=True)
def use_isolated_db(monkeypatch, tmp_path):
    """Isolates DuckDB file per test execution."""
    test_db = str(tmp_path / "test_api_query.duckdb")
    monkeypatch.setattr("db.DEFAULT_DB_PATH", test_db)


def test_api_query_success_first_attempt():
    """Test POST /api/query endpoint end-to-end with uploaded dataset succeeding on first attempt."""
    csv_content = "product,sales\nLaptop,1000\nMonitor,500\n"
    files = {"file": ("sales.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]

    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    table_name = schema_res.json()["table_name"]

    mock_llm_response = LLMResponse(
        text=f'{{"sql": "SELECT product, SUM(sales) AS total FROM \\"{table_name}\\" GROUP BY product ORDER BY total DESC", "explanation": "Calculates total sales per product.", "chart_type": "bar"}}',
        json_data={
            "sql": f'SELECT product, SUM(sales) AS total FROM "{table_name}" GROUP BY product ORDER BY total DESC',
            "explanation": "Calculates total sales per product.",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "What were the top products by sales?",
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["dataset_id"] == dataset_id
        assert data["question"] == "What were the top products by sales?"
        assert "SELECT product" in data["sql"]
        assert data["explanation"] == "Calculates total sales per product."
        assert data["chart"]["type"] in ["bar", "pie"]
        assert data["chart_type"] in ["bar", "pie"]
        assert data["attempts"] == 1
        assert data["results"]["columns"] == ["product", "total"]
        assert data["results"]["row_count"] == 2
        assert len(data["results"]["rows"]) == 2
        assert data["results"]["execution_time_ms"] >= 0.0


def test_api_query_self_correction_success():
    """Test POST /api/query endpoint self-corrects on attempt 2 when attempt 1 generates invalid column SQL."""
    csv_content = "product,quantity,unit_price\nLaptop,2,1000\nMonitor,1,500\n"
    files = {"file": ("sales.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]

    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    table_name = schema_res.json()["table_name"]

    # Attempt 1: Failed SQL with nonexistent column 'revenue'
    res_attempt_1 = LLMResponse(
        text=f'{{"sql": "SELECT product, SUM(revenue) FROM \\"{table_name}\\" GROUP BY product", "explanation": "Failed", "chart_type": "bar"}}',
        json_data={
            "sql": f'SELECT product, SUM(revenue) FROM "{table_name}" GROUP BY product',
            "explanation": "Failed",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    # Attempt 2: Corrected SQL deriving revenue from quantity * unit_price
    res_attempt_2 = LLMResponse(
        text=f'{{"sql": "SELECT product, SUM(quantity * unit_price) AS revenue FROM \\"{table_name}\\" GROUP BY product ORDER BY revenue DESC", "explanation": "Calculates revenue.", "chart_type": "bar"}}',
        json_data={
            "sql": f'SELECT product, SUM(quantity * unit_price) AS revenue FROM "{table_name}" GROUP BY product ORDER BY revenue DESC',
            "explanation": "Calculates revenue.",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", side_effect=[res_attempt_1, res_attempt_2]):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "What are top products by revenue?",
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["attempts"] == 2
        assert "quantity * unit_price" in data["sql"]
        assert data["results"]["columns"] == ["product", "revenue"]
        assert data["results"]["row_count"] == 2


def test_api_query_dataset_not_found():
    """Test POST /api/query returns 400 when dataset_id does not exist."""
    query_res = client.post(
        "/api/query",
        json={
            "dataset_id": "nonexistent-dataset-id",
            "question": "What are total sales?",
        },
    )
    assert query_res.status_code == 400
    assert "Failed to retrieve dataset schema" in query_res.json()["detail"]


def test_api_query_empty_question():
    """Test POST /api/query returns 400 when question is empty."""
    query_res = client.post(
        "/api/query",
        json={
            "dataset_id": "some-id",
            "question": "   ",
        },
    )
    assert query_res.status_code == 400
    assert "Question cannot be empty" in query_res.json()["detail"]


def test_api_query_unsafe_query_rejection():
    """Test POST /api/query returns 400 when model generates destructive SQL."""
    csv_content = "product,sales\nLaptop,1000\n"
    files = {"file": ("sales.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    dataset_id = upload_res.json()["dataset_id"]

    mock_llm_response = LLMResponse(
        text='{"sql": "DROP TABLE dataset_sales", "explanation": "Unsafe", "chart_type": "table"}',
        json_data={
            "sql": "DROP TABLE dataset_sales",
            "explanation": "Unsafe",
            "chart_type": "table",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.llm_service.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "Delete dataset.",
            },
        )
        assert query_res.status_code == 400
        assert "Only read-only SELECT queries are allowed" in query_res.json()["detail"]
