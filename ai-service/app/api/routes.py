import asyncio
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import settings
from app.deps import verify_internal_token
from app.schemas import (
    AssignmentFeedbackRequest,
    AssignmentGenerateRequest,
    ChatRequest,
    ContentIndexRequest,
    PlaygroundGenerateRequest,
    ScheduleSummarizeRequest,
    TestOpenRouterRequest,
)
from app.services.embeddings import (
    create_embedding,
    delete_content_embeddings,
    search_similar_chunks,
)
from app.services.ingestion import index_content
from app.services.transcription import transcribe_media_bytes
from app.services.openrouter import chat_completion, chat_json
from app.services.org_keys import get_org_openrouter_key
from app.services.playground import generate_playground_html
from app.services.prompts import build_system_prompt_with_rag
from app.db.pool import db_conn

router = APIRouter(prefix="/internal/v1", dependencies=[Depends(verify_internal_token)])

MAX_HISTORY = 20
MAX_MESSAGE_CHARS = 4000


def _sanitize_history(
    history: list[Any],
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for entry in history[-MAX_HISTORY:]:
        role = "assistant" if getattr(entry, "role", None) == "assistant" else "user"
        content = (getattr(entry, "content", "") or "")[:MAX_MESSAGE_CHARS].strip() or "(no text)"
        items.append({"role": role, "content": content})
    return items


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@router.post("/chat")
async def chat(body: ChatRequest) -> dict[str, Any]:
    api_key = get_org_openrouter_key(body.organization_id)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API key is not configured",
        )

    retrieved: list[dict[str, Any]] = []
    try:
        query_embedding = await create_embedding(api_key, body.message)
        retrieved = await search_similar_chunks(query_embedding, body.batch_id)
    except Exception:
        retrieved = []

    system_prompt = build_system_prompt_with_rag(body.prompt_context, retrieved)
    messages = [
        {"role": "system", "content": system_prompt},
        *_sanitize_history(body.history),
        {"role": "user", "content": body.message[:MAX_MESSAGE_CHARS]},
    ]

    try:
        reply_text = await chat_completion(
            api_key=api_key,
            model=settings.openrouter_model,
            messages=messages,
            temperature=0.3,
        )
    except Exception as exc:
        message = str(exc)
        if "429" in message or "rate limit" in message.lower():
            raise HTTPException(status_code=429, detail=message[:800]) from exc
        raise HTTPException(status_code=502, detail=message[:800]) from exc

    return {
        "replyText": reply_text,
        "ragChunksUsed": len(retrieved),
        "ragStatus": "ok" if retrieved else "no_chunks",
    }


@router.post("/playground/generate")
async def playground_generate(body: PlaygroundGenerateRequest) -> dict[str, str]:
    api_key = get_org_openrouter_key(body.organization_id)
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key is not configured")
    try:
        html = await generate_playground_html(
            api_key=api_key,
            concept=body.concept,
            instruction=body.instruction,
            batch_name=body.batch_name,
            exam=body.exam,
            language=body.language,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:800]) from exc
    return {"html": html}


@router.post("/content/index")
async def content_index(body: ContentIndexRequest) -> dict[str, bool]:
    asyncio.create_task(
        index_content(body.content_id, body.batch_id, body.organization_id)
    )
    return {"accepted": True}


@router.delete("/content/{content_id}/embeddings")
async def content_delete_embeddings(content_id: str) -> dict[str, bool]:
    await delete_content_embeddings(content_id)
    return {"deleted": True}


@router.post("/transcription/local-media")
async def transcription_local_media(
    file: UploadFile = File(...),
) -> dict[str, str]:
    data = await file.read()
    if not data:
        return {"text": ""}
    filename = file.filename or "chunk.webm"
    try:
        text = await transcribe_media_bytes(data, filename)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:800]) from exc
    return {"text": text}


@router.post("/assignments/feedback")
async def assignment_feedback(body: AssignmentFeedbackRequest) -> dict[str, Any]:
    api_key = get_org_openrouter_key(body.organization_id)
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key is not configured")
    try:
        return await chat_json(
            api_key=api_key,
            model=settings.openrouter_model,
            prompt=body.prompt,
            temperature=0.2,
            max_tokens=settings.openrouter_assignment_feedback_max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:800]) from exc


@router.post("/assignments/generate-questions")
async def assignment_generate(body: AssignmentGenerateRequest) -> dict[str, Any]:
    api_key = get_org_openrouter_key(body.organization_id)
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key is not configured")
    try:
        return await chat_json(
            api_key=api_key,
            model=settings.openrouter_model,
            prompt=body.generation_prompt,
            temperature=0.35,
            max_tokens=settings.openrouter_assignment_generation_max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:800]) from exc


@router.post("/schedules/summarize")
async def schedule_summarize(body: ScheduleSummarizeRequest) -> dict[str, str]:
    api_key = get_org_openrouter_key(body.organization_id)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API key is not configured for summary generation",
        )
    transcript = body.transcript
    if len(transcript) > 24000:
        transcript = transcript[:24000] + "\n\n[Transcript truncated for summary generation]"
    prompt = (
        f"This is a transcript of a live class titled {body.title}. Summarize: "
        "main topics explained, questions students asked, and key takeaways.\n\n"
        f"Transcript:\n{transcript}"
    )
    try:
        summary = await chat_completion(
            api_key=api_key,
            model=settings.openrouter_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=settings.openrouter_summary_max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:800]) from exc
    return {"summary": summary}


@router.post("/admin/test-openrouter-key")
async def test_openrouter_key(body: TestOpenRouterRequest) -> dict[str, Any]:
    api_key = body.api_key.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="apiKey is required")
    model = (body.model or settings.openrouter_model).strip()
    try:
        await chat_completion(
            api_key=api_key,
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=8,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid OpenRouter API key or model: {str(exc)[:400]}",
        ) from exc

    if body.test_embeddings:
        try:
            await create_embedding(api_key, "test")
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Chat OK but embeddings (RAG) failed: {str(exc)[:400]}",
            ) from exc

    return {
        "valid": True,
        "message": (
            "OpenRouter chat and embeddings API are working."
            if body.test_embeddings
            else "OpenRouter API key is valid for chat."
        ),
    }


@router.get("/admin/embedding-health")
async def embedding_health() -> dict[str, Any]:
    def _query() -> dict[str, Any]:
        with db_conn() as conn:
            total = conn.execute("SELECT COUNT(*) AS c FROM contents").fetchone()["c"]
            with_text = conn.execute(
                """
                SELECT COUNT(*) AS c FROM contents
                WHERE "extractedText" IS NOT NULL AND TRIM("extractedText") <> ''
                """
            ).fetchone()["c"]
            without = conn.execute(
                """
                SELECT id, title, type, "topicId"
                FROM contents
                WHERE "extractedText" IS NULL OR TRIM("extractedText") = ''
                ORDER BY "createdAt" DESC
                """
            ).fetchall()
            embedded = conn.execute(
                "SELECT COUNT(DISTINCT content_id) AS c FROM content_embeddings"
            ).fetchone()["c"]
        return {
            "totalContentCount": int(total),
            "contentWithExtractedTextCount": int(with_text),
            "contentWithEmbeddingsCount": int(embedded),
            "contentWithoutExtractedText": without,
        }

    return await asyncio.to_thread(_query)
