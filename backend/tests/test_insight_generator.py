import os
import sys
import pytest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.insight_generator import generate_insight_from_results, InsightResult
from services.llm_service import LLMClient, LLMResponse


def test_insight_generator_success_mocked():
    """Verifies structured insight generation with a mocked LLM client."""
    mock_llm = MagicMock(spec=LLMClient)
    mock_llm.generate.return_value = LLMResponse(
        text='{"insight": "Laptop generated the highest revenue at $2,400."}',
        json_data={"insight": "Laptop generated the highest revenue at $2,400."},
        model_name="gemini-2.5-flash",
        success=True,
    )

    result: InsightResult = generate_insight_from_results(
        question="What are the top products by revenue?",
        sql="SELECT product, SUM(sales) AS revenue FROM sales GROUP BY product ORDER BY revenue DESC LIMIT 5",
        columns=["product", "revenue"],
        rows=[["Laptop", 2400.0], ["Monitor", 1800.0]],
        row_count=2,
        llm_client=mock_llm,
    )

    assert result.success is True
    assert "Laptop generated the highest revenue" in result.insight
    mock_llm.generate.assert_called_once()


def test_insight_generator_empty_rows():
    """Zero rows should return a deterministic empty result message without calling LLM."""
    mock_llm = MagicMock(spec=LLMClient)

    result = generate_insight_from_results(
        question="Show sales for non-existent category",
        sql="SELECT * FROM sales WHERE category = 'Unknown'",
        columns=["product", "sales"],
        rows=[],
        row_count=0,
        llm_client=mock_llm,
    )

    assert result.success is True
    assert "No matching records" in result.insight
    mock_llm.generate.assert_not_called()


def test_insight_generator_single_kpi_row():
    """Single numeric aggregate row should return a deterministic KPI explanation."""
    mock_llm = MagicMock(spec=LLMClient)

    result = generate_insight_from_results(
        question="What is total revenue?",
        sql="SELECT SUM(sales) AS total_revenue FROM sales",
        columns=["total_revenue"],
        rows=[[5400.0]],
        row_count=1,
        llm_client=mock_llm,
    )

    assert result.success is True
    assert "5,400.00" in result.insight
    mock_llm.generate.assert_not_called()


def test_insight_generator_llm_failure_fallback():
    """Fallback insight generation when LLM API returns failure."""
    mock_llm = MagicMock(spec=LLMClient)
    mock_llm.generate.return_value = LLMResponse(
        text="",
        json_data=None,
        model_name="gemini-2.5-flash",
        success=False,
        error_message="API Rate limit exceeded",
    )

    result = generate_insight_from_results(
        question="Top products",
        sql="SELECT product, sales FROM sales",
        columns=["product", "sales"],
        rows=[["Laptop", 2400.0], ["Desk", 1200.0]],
        row_count=2,
        llm_client=mock_llm,
    )

    assert result.success is True
    assert "The query returned 2 rows" in result.insight
    assert "Laptop" in result.insight
