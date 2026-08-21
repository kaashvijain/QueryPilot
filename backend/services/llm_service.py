import json
import logging
import time
from typing import Dict, Any, Optional, Type
from pydantic import BaseModel, Field
from config import get_settings

logger = logging.getLogger("querypilot.llm_service")


class LLMResponse(BaseModel):
    """Structured response object returned by LLMClient."""
    text: str = ""
    json_data: Optional[Dict[str, Any]] = None
    model_name: str
    tokens_used: Dict[str, int] = Field(default_factory=dict)
    success: bool = True
    error_message: Optional[str] = None


class LLMClient:
    """
    Isolated LLM client for QueryPilot.
    Supports text generation and structured JSON outputs via Google Gemini API.
    Provider-specific SDK code is encapsulated strictly within this module.
    Includes automatic retry for transient 503 / 429 API rate limits.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        settings = get_settings()
        self.api_key = settings.gemini_api_key if api_key is None else api_key
        self.model_name = model_name or settings.llm_model or "gemini-3.6-flash"
        self._client = None

    def _get_client(self):
        """Lazy initialization of Google GenAI client."""
        if not self.api_key:
            raise ValueError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in environment or .env file."
            )
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "google-genai package is not installed. Install it via `pip install google-genai`."
                )
        return self._client

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_schema: Optional[Type[BaseModel]] = None,
    ) -> LLMResponse:
        """
        Sends a prompt to the LLM and returns a structured LLMResponse.
        Includes automatic retries for transient 503 high-demand spikes.
        Handles API errors gracefully without crashing the application.
        """
        if not self.api_key:
            return LLMResponse(
                text="",
                model_name=self.model_name,
                success=False,
                error_message="API Key is missing. Please configure GEMINI_API_KEY.",
            )

        max_retries = 4
        last_exception = None

        for attempt in range(1, max_retries + 1):
            try:
                from google.genai import types

                client = self._get_client()

                config_kwargs: Dict[str, Any] = {}
                if system_instruction:
                    config_kwargs["system_instruction"] = system_instruction

                if response_schema:
                    config_kwargs["response_mime_type"] = "application/json"
                    config_kwargs["response_schema"] = response_schema

                config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

                # Execute completion
                raw_response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )

                response_text = raw_response.text or ""
                parsed_json = None

                # Attempt parsing structured JSON if requested or available
                if response_schema or (response_text.strip().startswith("{") and response_text.strip().endswith("}")):
                    try:
                        parsed_json = json.loads(response_text)
                    except Exception:
                        parsed_json = None

                # Extract token usage metadata if provided
                tokens_used = {}
                if hasattr(raw_response, "usage_metadata") and raw_response.usage_metadata:
                    meta = raw_response.usage_metadata
                    tokens_used = {
                        "input_tokens": getattr(meta, "prompt_token_count", 0) or 0,
                        "output_tokens": getattr(meta, "candidates_token_count", 0) or 0,
                        "total_tokens": getattr(meta, "total_token_count", 0) or 0,
                    }

                return LLMResponse(
                    text=response_text,
                    json_data=parsed_json,
                    model_name=self.model_name,
                    tokens_used=tokens_used,
                    success=True,
                )

            except Exception as exc:
                last_exception = exc
                err_str = str(exc)
                if ("503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < max_retries:
                    retry_delay = attempt * 5.0 if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) else attempt * 2.0
                    logger.warning(
                        f"LLM API rate limit or transient error (attempt {attempt}/{max_retries}), retrying in {retry_delay}s..."
                    )
                    time.sleep(retry_delay)
                    continue
                else:
                    break

        raw_err_msg = str(last_exception) if last_exception else "Unknown error"
        if "429" in raw_err_msg or "RESOURCE_EXHAUSTED" in raw_err_msg or "Quota exceeded" in raw_err_msg:
            user_friendly_msg = "Gemini API rate limit or quota exceeded (429 RESOURCE_EXHAUSTED). Please wait a minute before retrying, or check your API key quota."
        else:
            # Clean raw dict dumps if present
            user_friendly_msg = raw_err_msg.split("\n")[0] if "\n" in raw_err_msg else raw_err_msg

        logger.error(f"LLM API Call failed: {user_friendly_msg}")
        return LLMResponse(
            text="",
            model_name=self.model_name,
            success=False,
            error_message=f"LLM Provider Error: {user_friendly_msg}",
        )
