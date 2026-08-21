import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.llm_service import LLMClient, LLMResponse


def test_llm_client_missing_api_key():
    """Test generating completion when API key is missing returns clean error response."""
    client = LLMClient(api_key="")
    response = client.generate("What is 2 + 2?")

    assert response.success is False
    assert "API Key is missing" in response.error_message
    assert response.text == ""


def test_llm_client_successful_text_generation():
    """Test successful LLM text generation using a mocked Gemini client response."""
    mock_raw_response = MagicMock()
    mock_raw_response.text = "The total sales count is 100."
    
    mock_usage = MagicMock()
    mock_usage.prompt_token_count = 15
    mock_usage.candidates_token_count = 8
    mock_usage.total_token_count = 23
    mock_raw_response.usage_metadata = mock_usage

    mock_genai_client = MagicMock()
    mock_genai_client.models.generate_content.return_value = mock_raw_response

    with patch("services.llm_service.LLMClient._get_client", return_value=mock_genai_client):
        client = LLMClient(api_key="mock_test_key_123", model_name="gemini-2.5-flash")
        response = client.generate("How many sales?")

        assert response.success is True
        assert response.text == "The total sales count is 100."
        assert response.model_name == "gemini-2.5-flash"
        assert response.tokens_used == {
            "input_tokens": 15,
            "output_tokens": 8,
            "total_tokens": 23,
        }


def test_llm_client_structured_json_output():
    """Test parsing structured JSON responses."""
    json_str = '{"sql": "SELECT * FROM sales LIMIT 5", "explanation": "Top 5 sales"}'
    
    mock_raw_response = MagicMock()
    mock_raw_response.text = json_str
    mock_raw_response.usage_metadata = None

    mock_genai_client = MagicMock()
    mock_genai_client.models.generate_content.return_value = mock_raw_response

    class MockSchema(BaseModel):
        sql: str
        explanation: str

    with patch("services.llm_service.LLMClient._get_client", return_value=mock_genai_client):
        client = LLMClient(api_key="mock_test_key_123")
        response = client.generate("Generate SQL query", response_schema=MockSchema)

        assert response.success is True
        assert response.json_data == {
            "sql": "SELECT * FROM sales LIMIT 5",
            "explanation": "Top 5 sales",
        }


def test_llm_client_api_error_handling():
    """Test handling API exceptions gracefully without crashing."""
    mock_genai_client = MagicMock()
    mock_genai_client.models.generate_content.side_effect = RuntimeError("API Quota Exceeded / Network Timeout")

    with patch("services.llm_service.LLMClient._get_client", return_value=mock_genai_client):
        client = LLMClient(api_key="mock_test_key_123")
        response = client.generate("Test query")

        assert response.success is False
        assert "API Quota Exceeded / Network Timeout" in response.error_message
        assert response.text == ""
