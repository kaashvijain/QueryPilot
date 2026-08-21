import os
import sys
import pytest
import tempfile
from unittest.mock import MagicMock, patch
from services.query_pipeline import run_query_pipeline, QueryPipelineResult
from services.llm_service import LLMResponse
from db import ingest_csv_to_duckdb, get_table_name

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def temp_dataset():
    """Ingests a sample CSV file into a temporary DuckDB database for pipeline tests."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_pipeline.duckdb")
    csv_path = os.path.join(temp_dir, "test_sales.csv")

    csv_content = (
        "product,quantity,unit_price,category\n"
        "Laptop,2,1200.00,Electronics\n"
        "Monitor,1,300.00,Electronics\n"
        "Keyboard,5,50.00,Accessories\n"
    )
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write(csv_content)

    dataset_id = "pipeline-test-dataset-123"
    ingest_csv_to_duckdb(dataset_id, csv_path, db_path=db_path)

    yield {
        "dataset_id": dataset_id,
        "table_name": get_table_name(dataset_id),
        "db_path": db_path,
    }


def test_pipeline_success_first_attempt(temp_dataset):
    """Test query pipeline succeeds on the first attempt when LLM generates valid SQL."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]

    mock_llm = MagicMock()
    mock_llm.generate.return_value = LLMResponse(
        text=f'{{"sql": "SELECT product, quantity FROM \\"{table_name}\\"", "explanation": "Valid", "chart_type": "bar"}}',
        json_data={
            "sql": f'SELECT product, quantity FROM "{table_name}"',
            "explanation": "Valid",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    res = run_query_pipeline(
        dataset_id=dataset_id,
        question="Show product quantity.",
        db_path=db_path,
        max_attempts=3,
        llm_client=mock_llm,
    )

    assert res.success is True
    assert res.attempts == 1
    assert res.results is not None
    assert res.results.columns == ["product", "quantity"]
    assert res.results.row_count == 3
    assert mock_llm.generate.call_count >= 1


def test_pipeline_failure_then_success(temp_dataset):
    """Test query pipeline fails on attempt 1 with execution error, calls corrector, and succeeds on attempt 2."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]

    mock_llm = MagicMock()
    # Attempt 1: Failed SQL referencing nonexistent column 'revenue'
    response_attempt_1 = LLMResponse(
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
    response_attempt_2 = LLMResponse(
        text=f'{{"sql": "SELECT product, SUM(quantity * unit_price) AS revenue FROM \\"{table_name}\\" GROUP BY product ORDER BY revenue DESC", "explanation": "Corrected", "chart_type": "bar"}}',
        json_data={
            "sql": f'SELECT product, SUM(quantity * unit_price) AS revenue FROM "{table_name}" GROUP BY product ORDER BY revenue DESC',
            "explanation": "Corrected",
            "chart_type": "bar",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )

    response_insight = LLMResponse(
        text='{"insight": "Corrected"}',
        json_data={"insight": "Corrected"},
        model_name="gemini-2.5-flash",
        success=True,
    )

    mock_llm.generate.side_effect = [response_attempt_1, response_attempt_2, response_insight]

    res = run_query_pipeline(
        dataset_id=dataset_id,
        question="What are top products by revenue?",
        db_path=db_path,
        max_attempts=3,
        llm_client=mock_llm,
    )

    assert res.success is True
    assert res.attempts == 2
    assert res.explanation == "Corrected"
    assert res.results is not None
    assert res.results.columns == ["product", "revenue"]
    assert res.results.row_count == 3
    assert mock_llm.generate.call_count == 3


def test_pipeline_failure_all_attempts(temp_dataset):
    """Test query pipeline stops after 3 failed attempts and returns structured error."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]

    mock_llm = MagicMock()
    failed_response = LLMResponse(
        text=f'{{"sql": "SELECT invalid_col FROM \\"{table_name}\\"", "explanation": "Failed", "chart_type": "table"}}',
        json_data={
            "sql": f'SELECT invalid_col FROM "{table_name}"',
            "explanation": "Failed",
            "chart_type": "table",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )
    mock_llm.generate.return_value = failed_response

    res = run_query_pipeline(
        dataset_id=dataset_id,
        question="Show invalid data.",
        db_path=db_path,
        max_attempts=3,
        llm_client=mock_llm,
    )

    assert res.success is False
    assert res.attempts == 3
    assert res.results is None
    assert "Failed to execute query after 3 attempts" in res.error_message
    assert mock_llm.generate.call_count == 3


def test_pipeline_unsafe_query_rejection(temp_dataset):
    """Test query pipeline blocks destructive queries immediately on attempt 1 with zero retries."""
    dataset_id = temp_dataset["dataset_id"]
    table_name = temp_dataset["table_name"]
    db_path = temp_dataset["db_path"]

    mock_llm = MagicMock()
    unsafe_response = LLMResponse(
        text=f'{{"sql": "DROP TABLE \\"{table_name}\\"", "explanation": "Unsafe", "chart_type": "table"}}',
        json_data={
            "sql": f'DROP TABLE "{table_name}"',
            "explanation": "Unsafe",
            "chart_type": "table",
        },
        model_name="gemini-3.6-flash",
        success=True,
    )
    mock_llm.generate.return_value = unsafe_response

    res = run_query_pipeline(
        dataset_id=dataset_id,
        question="Delete my dataset.",
        db_path=db_path,
        max_attempts=3,
        llm_client=mock_llm,
    )

    assert res.success is False
    assert res.attempts == 1
    assert res.results is None
    assert "Only read-only SELECT queries are allowed" in res.error_message
    assert mock_llm.generate.call_count == 1
