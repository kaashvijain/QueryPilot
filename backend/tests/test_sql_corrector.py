import os
import sys
import pytest
from unittest.mock import MagicMock
from services.sql_corrector import (
    generate_corrected_sql,
    build_correction_prompt,
    CORRECTION_SYSTEM_PROMPT,
)
from services.sql_generator import SQLGenerationResult
from services.llm_service import LLMResponse

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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


def test_build_correction_prompt(sample_schema):
    """Test that build_correction_prompt includes question, failed SQL, error message, and schema."""
    question = "What are top products by revenue?"
    failed_sql = "SELECT product, SUM(revenue) FROM dataset_sales GROUP BY product;"
    error_message = 'Binder Error: Column "revenue" not found in dataset_sales'

    prompt = build_correction_prompt(question, sample_schema, failed_sql, error_message)

    assert "Table: dataset_sales" in prompt
    assert "Original User Question:\nWhat are top products by revenue?" in prompt
    assert "Previously Generated SQL (FAILED):\nSELECT product, SUM(revenue)" in prompt
    assert 'Binder Error: Column "revenue" not found' in prompt
    assert "- product: VARCHAR" in prompt
    assert "- unit_price: DOUBLE" in prompt


def test_generate_corrected_sql_success(sample_schema):
    """Test successful SQL correction with mocked LLM response."""
    mock_client = MagicMock()
    mock_client.generate.return_value = LLMResponse(
        text='{"sql": "SELECT product, SUM(quantity * unit_price) AS revenue FROM dataset_sales GROUP BY product ORDER BY revenue DESC", "explanation": "Replaced missing column revenue with quantity * unit_price calculation.", "chart_type": "bar"}',
        json_data={
            "sql": "SELECT product, SUM(quantity * unit_price) AS revenue FROM dataset_sales GROUP BY product ORDER BY revenue DESC",
            "explanation": "Replaced missing column revenue with quantity * unit_price calculation.",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    question = "What are top products by revenue?"
    failed_sql = "SELECT product, SUM(revenue) FROM dataset_sales GROUP BY product;"
    error_message = 'Binder Error: Column "revenue" not found in dataset_sales'

    res = generate_corrected_sql(
        question=question,
        schema_info=sample_schema,
        failed_sql=failed_sql,
        error_message=error_message,
        llm_client=mock_client,
    )

    assert res.success is True
    assert "SUM(quantity * unit_price)" in res.sql
    assert res.explanation == "Replaced missing column revenue with quantity * unit_price calculation."
    assert res.chart_type == "bar"

    mock_client.generate.assert_called_once()
    call_args, call_kwargs = mock_client.generate.call_args
    assert CORRECTION_SYSTEM_PROMPT == call_kwargs["system_instruction"]


def test_generate_corrected_sql_empty_inputs(sample_schema):
    """Test passing empty failed SQL or error message returns immediate error without calling LLM."""
    mock_client = MagicMock()

    res_sql = generate_corrected_sql("Question", sample_schema, "", "Error", llm_client=mock_client)
    assert res_sql.success is False
    assert "Failed SQL query string cannot be empty" in res_sql.error_message

    res_err = generate_corrected_sql("Question", sample_schema, "SELECT 1", "   ", llm_client=mock_client)
    assert res_err.success is False
    assert "Database error message cannot be empty" in res_err.error_message

    mock_client.generate.assert_not_called()


def test_generate_corrected_sql_llm_failure(sample_schema):
    """Test handling LLM API timeouts or errors gracefully."""
    mock_client = MagicMock()
    mock_client.generate.return_value = LLMResponse(
        text="Error",
        json_data=None,
        model_name="gemini-3.6-flash",
        success=False,
        error_message="503 Service Unavailable",
    )

    res = generate_corrected_sql(
        question="Question",
        schema_info=sample_schema,
        failed_sql="SELECT bad FROM table",
        error_message="Error",
        llm_client=mock_client,
    )

    assert res.success is False
    assert "503 Service Unavailable" in res.error_message
