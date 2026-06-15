import asyncio
import json
import time
from typing import Any

from app.config import settings
from app.db.pool import db_conn
from app.services.openrouter import create_embedding
from app.services.org_keys import get_org_openrouter_key

DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 100


def chunk_text(
    text: str,
    max_chars: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    if not text or len(text) <= max_chars:
        return [text] if text else []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + max_chars
        if end < len(text):
            last_period = text.rfind(". ", start, end)
            last_newline = text.rfind("\n", start, end)
            best_break = max(last_period, last_newline)
            if best_break > start + max_chars * 0.5:
                end = best_break + 1
        chunks.append(text[start:end].strip())
        start = end - overlap
    return [c for c in chunks if c]


def _set_embedding_status(
    content_id: str,
    status: str,
    error: str | None = None,
) -> None:
    with db_conn() as conn:
        conn.execute(
            """
            UPDATE contents
            SET "embeddingIndexStatus" = %s::"ContentEmbeddingStatus",
                "embeddingIndexError" = %s
            WHERE id = %s
            """,
            (status, error, content_id),
        )
        conn.commit()


async def search_similar_chunks(
    query_embedding: list[float],
    batch_id: str,
    top_k: int | None = None,
    *,
    topic_id: str | None = None,
    content_ids: list[str] | None = None,
    similarity_threshold: float | None = None,
) -> list[dict[str, Any]]:
    k = top_k or settings.rag_top_k
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"
    threshold = (
        similarity_threshold
        if similarity_threshold is not None
        else settings.rag_similarity_threshold
    )
    filtered_content_ids = [cid for cid in (content_ids or []) if cid]

    def _search() -> list[dict[str, Any]]:
        with db_conn() as conn:
            rows = conn.execute(
                """
                SELECT
                  content_id,
                  chunk_text,
                  source_field,
                  1 - (embedding <=> %s::vector) AS similarity,
                  metadata
                FROM content_embeddings
                WHERE batch_id = %s
                  AND 1 - (embedding <=> %s::vector) > %s
                  AND (%s::text IS NULL OR metadata->>'topicId' = %s)
                  AND (
                    %s::text[] IS NULL
                    OR cardinality(%s::text[]) = 0
                    OR content_id = ANY(%s::text[])
                  )
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (
                    embedding_str,
                    batch_id,
                    embedding_str,
                    threshold,
                    topic_id,
                    topic_id,
                    filtered_content_ids or None,
                    filtered_content_ids or None,
                    filtered_content_ids or None,
                    embedding_str,
                    k,
                ),
            ).fetchall()
        results = []
        for row in rows:
            metadata = row.get("metadata")
            if isinstance(metadata, str):
                metadata = json.loads(metadata)
            results.append(
                {
                    "content_id": row.get("content_id"),
                    "chunk_text": row["chunk_text"],
                    "source_field": row["source_field"],
                    "similarity": float(row["similarity"]),
                    "metadata": metadata or {},
                }
            )
        return results

    return await asyncio.to_thread(_search)


async def upsert_content_embeddings(
    content_id: str,
    batch_id: str,
    organization_id: str,
) -> None:
    await asyncio.to_thread(_set_embedding_status, content_id, "PENDING", None)

    api_key = get_org_openrouter_key(organization_id)
    if not api_key:
        await asyncio.to_thread(
            _set_embedding_status,
            content_id,
            "SKIPPED",
            "OpenRouter API key is not configured for this organization.",
        )
        return

    def _load_content() -> dict[str, Any] | None:
        with db_conn() as conn:
            row = conn.execute(
                """
                SELECT c.id, c."topicId", c.title, c."extractedText",
                       t.name AS topic_name, ch.name AS chapter_name
                FROM contents c
                JOIN topics t ON t.id = c."topicId"
                JOIN chapters ch ON ch.id = t."chapterId"
                WHERE c.id = %s
                """,
                (content_id,),
            ).fetchone()
        return row

    content = await asyncio.to_thread(_load_content)
    if not content:
        return

    text_to_embed = (content.get("extractedText") or "").strip()
    if not text_to_embed:
        await asyncio.to_thread(
            _set_embedding_status,
            content_id,
            "SKIPPED",
            "No extractable lesson text (add markdown, PDF, or video with transcript).",
        )
        return

    metadata = json.dumps(
        {
            "contentId": content_id,
            "contentTitle": content.get("title"),
            "topicId": content.get("topicId"),
            "topicName": content.get("topic_name"),
            "chapterName": content.get("chapter_name"),
        }
    )

    def _delete_old() -> None:
        with db_conn() as conn:
            conn.execute(
                "DELETE FROM content_embeddings WHERE content_id = %s",
                (content_id,),
            )
            conn.commit()

    await asyncio.to_thread(_delete_old)

    chunks = chunk_text(text_to_embed)
    embedded = 0
    last_error: str | None = None

    for index, chunk in enumerate(chunks):
        try:
            embedding = await create_embedding(api_key, chunk)
            embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

            def _insert() -> None:
                with db_conn() as conn:
                    conn.execute(
                        """
                        INSERT INTO content_embeddings (
                          content_id, batch_id, chunk_index, chunk_text,
                          source_field, embedding, metadata
                        )
                        VALUES (%s, %s, %s, %s, %s, %s::vector, %s::jsonb)
                        ON CONFLICT (content_id, source_field, chunk_index)
                        DO UPDATE SET
                          chunk_text = EXCLUDED.chunk_text,
                          embedding = EXCLUDED.embedding,
                          metadata = EXCLUDED.metadata,
                          updated_at = NOW()
                        """,
                        (
                            content_id,
                            batch_id,
                            index,
                            chunk,
                            "extractedText",
                            embedding_str,
                            metadata,
                        ),
                    )
                    conn.commit()

            await asyncio.to_thread(_insert)
            embedded += 1
            if index < len(chunks) - 1:
                await asyncio.sleep(0.1)
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)

    if embedded == 0:
        await asyncio.to_thread(
            _set_embedding_status,
            content_id,
            "FAILED",
            last_error or "All embedding chunks failed.",
        )
    elif embedded < len(chunks):
        await asyncio.to_thread(
            _set_embedding_status,
            content_id,
            "READY",
            f"Indexed {embedded}/{len(chunks)} chunks; some chunks failed.",
        )
    else:
        await asyncio.to_thread(_set_embedding_status, content_id, "READY", None)


async def delete_content_embeddings(content_id: str) -> None:
    def _delete() -> None:
        with db_conn() as conn:
            conn.execute(
                "DELETE FROM content_embeddings WHERE content_id = %s",
                (content_id,),
            )
            conn.commit()

    await asyncio.to_thread(_delete)
