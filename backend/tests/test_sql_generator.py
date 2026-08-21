import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.sql_generator import (
    generate_sql_from_question,
    build_sql_prompt,
    SQLGenerationResult,
    SYSTEM_PROMPT,
)
from services.llm_service import LLMResponse

client = TestClient(app)


@pytest.fixture(autouse=True)
def use_isolated_db(monkeypatch, tmp_path):
    """Isolates DuckDB file per test execution."""
    test_db = str(tmp_path / "test_api_query.duckdb")
    monkeypatch.setattr("db.DEFAULT_DB_PATH", test_db)


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


def test_build_sql_prompt(sample_schema):
    """Test that build_sql_prompt includes table name, columns, and user question."""
    question = "What are the top 5 products by revenue?"
    prompt = build_sql_prompt(question, sample_schema)

    assert "Table: dataset_sales" in prompt
    assert "Rows: 84392" in prompt
    assert "- product: VARCHAR" in prompt
    assert "- unit_price: DOUBLE" in prompt
    assert "What are the top 5 products by revenue?" in prompt


def test_generate_sql_success(sample_schema):
    """Test successful SQL generation with mocked LLM response."""
    mock_client = MagicMock()
    mock_client.generate.return_value = LLMResponse(
        text='{"sql": "SELECT product, SUM(quantity * unit_price) AS revenue FROM dataset_sales GROUP BY product ORDER BY revenue DESC LIMIT 5", "explanation": "Calculates top 5 products by total revenue.", "chart_type": "bar"}',
        json_data={
            "sql": "SELECT product, SUM(quantity * unit_price) AS revenue FROM dataset_sales GROUP BY product ORDER BY revenue DESC LIMIT 5",
            "explanation": "Calculates top 5 products by total revenue.",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        tokens_used={"input_tokens": 50, "output_tokens": 30, "total_tokens": 80},
        success=True,
    )

    question = "What were the top 5 products by revenue?"
    result = generate_sql_from_question(question, sample_schema, llm_client=mock_client)

    assert result.success is True
    assert "SELECT product" in result.sql
    assert result.explanation == "Calculates top 5 products by total revenue."
    assert result.chart_type == "bar"

    # Verify prompt & system instruction were passed to client
    mock_client.generate.assert_called_once()
    call_args, call_kwargs = mock_client.generate.call_args
    assert SYSTEM_PROMPT == call_kwargs["system_instruction"]


def test_generate_sql_malformed_llm_response(sample_schema):
    """Test handling malformed or failed LLM responses gracefully."""
    mock_client = MagicMock()
    mock_client.generate.return_value = LLMResponse(
        text="Sorry, I cannot help with that.",
        json_data=None,
        model_name="gemini-3.6-flash",
        success=False,
        error_message="LLM Provider Error: Network Timeout",
    )

    question = "What are the total sales?"
    result = generate_sql_from_question(question, sample_schema, llm_client=mock_client)

    assert result.success is False
    assert result.sql == ""
    assert "Network Timeout" in result.error_message


def test_generate_sql_empty_json_response(sample_schema):
    """Test handling when LLM succeeds but returns empty or missing SQL."""
    mock_client = MagicMock()
    mock_client.generate.return_value = LLMResponse(
        text="{}",
        json_data={},
        model_name="gemini-3.6-flash",
        success=True,
    )

    question = "Which category sold the most?"
    result = generate_sql_from_question(question, sample_schema, llm_client=mock_client)

    assert result.success is False
    assert "did not contain a valid SQL query" in result.error_message


def test_generate_sql_empty_question(sample_schema):
    """Test passing an empty user question returns immediate error without calling LLM."""
    mock_client = MagicMock()

    result = generate_sql_from_question("   ", sample_schema, llm_client=mock_client)

    assert result.success is False
    assert "Question cannot be empty" in result.error_message
    mock_client.generate.assert_not_called()


def test_api_query_endpoint():
    """Test POST /api/query endpoint with uploaded CSV dataset."""
    csv_content = "product,sales\nLaptop,1000\nMonitor,500\n"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]

    mock_llm_response = LLMResponse(
        text='{"sql": "SELECT product, SUM(sales) FROM dataset", "explanation": "Test", "chart_type": "bar"}',
        json_data={"sql": "SELECT product, SUM(sales) FROM dataset", "explanation": "Test", "chart_type": "bar"},
        model_name="gemini-3.6-flash",
        success=True,
    )

    with patch("services.sql_generator.LLMClient.generate", return_value=mock_llm_response):
        query_res = client.post(
            "/api/query",
            json={
                "dataset_id": dataset_id,
                "question": "What are top products by sales?",
            },
        )
        assert query_res.status_code == 200
        data = query_res.json()
        assert data["dataset_id"] == dataset_id
        assert data["sql"] == "SELECT product, SUM(sales) FROM dataset"
        assert data["explanation"] == "Test"
        assert data["chart_type"] == "bar"
