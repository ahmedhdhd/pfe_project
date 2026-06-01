import json
from typing import Any

import httpx

from app.config import settings

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings"


def build_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_http_referer.strip() or "http://localhost:3000",
        "X-Title": settings.openrouter_app_title.strip() or "QuetzLearn LMS",
    }


async def chat_completion(
    *,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int | None = None,
    response_format: dict[str, str] | None = None,
) -> str:
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if response_format is not None:
        body["response_format"] = response_format

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            OPENROUTER_CHAT_URL,
            headers=build_headers(api_key),
            json=body,
        )
        raw = response.text
        if not response.is_success:
            raise RuntimeError(
                f"OpenRouter request failed ({response.status_code}): {raw[:800]}"
            )
        payload = json.loads(raw)
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not content:
            raise RuntimeError("OpenRouter returned an empty reply")
        return content


async def chat_json(
    *,
    api_key: str,
    model: str,
    prompt: str,
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> dict[str, Any]:
    content = await chat_completion(
        api_key=api_key,
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    return extract_json_object(content)


def extract_json_object(text: str) -> dict[str, Any]:
    trimmed = text.strip()
    try:
        parsed = json.loads(trimmed)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    start = trimmed.find("{")
    end = trimmed.rfind("}")
    if start >= 0 and end > start:
        parsed = json.loads(trimmed[start : end + 1])
        if isinstance(parsed, dict):
            return parsed
    raise ValueError("AI response did not contain JSON")


async def create_embedding(api_key: str, text: str) -> list[float]:
    truncated = text[:8000]
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            OPENROUTER_EMBEDDINGS_URL,
            headers=build_headers(api_key),
            json={
                "model": settings.openrouter_embedding_model,
                "input": truncated,
            },
        )
        raw = response.text
        if not response.is_success:
            raise RuntimeError(
                f"OpenRouter embeddings {response.status_code}: {raw[:400]}"
            )
        payload = json.loads(raw)
        vector = payload.get("data", [{}])[0].get("embedding")
        if not vector:
            raise RuntimeError("OpenRouter embeddings: empty vector in response")
        if len(vector) != settings.embedding_dimensions:
            raise RuntimeError(
                f"Embedding dimension is {len(vector)} but expected "
                f"{settings.embedding_dimensions}"
            )
        return vector
