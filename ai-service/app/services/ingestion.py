import asyncio
import os
import re
import subprocess
import tempfile
import uuid
from typing import Any
import httpx
from pypdf import PdfReader
from youtube_transcript_api import YouTubeTranscriptApi

from app.config import settings
from app.db.pool import db_conn
from app.services.embeddings import upsert_content_embeddings

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = "whisper-large-v3-turbo"


def _extract_youtube_id(url: str) -> str | None:
    patterns = [
        r"(?:youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/v/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _is_youtube(url: str) -> bool:
    return bool(re.search(r"youtube\.com|youtu\.be", url, re.I))


async def _extract_youtube_transcript(video_url: str) -> str:
    video_id = _extract_youtube_id(video_url)
    if not video_id:
        return ""

    def _fetch() -> str:
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            text = " ".join(item.get("text", "").strip() for item in transcript if item.get("text"))
            return text.strip()
        except Exception:
            return ""

    return await asyncio.to_thread(_fetch)


async def _extract_pdf_text(pdf_url: str) -> str:
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(pdf_url)
        if not response.is_success:
            return ""
        data = response.content

    def _parse() -> str:
        reader = PdfReader(stream=bytes(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()

    return await asyncio.to_thread(_parse)


def _transcribe_audio_file(audio_path: str, api_key: str) -> str:
    with open(audio_path, "rb") as audio_file:
        files = {"file": ("audio.mp3", audio_file, "audio/mpeg")}
        data = {"model": GROQ_WHISPER_MODEL}
        response = httpx.post(
            GROQ_TRANSCRIPTION_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files=files,
            data=data,
            timeout=300.0,
        )
    if not response.is_success:
        raise RuntimeError(f"Groq API error {response.status_code}: {response.text[:400]}")
    payload = response.json()
    return str(payload.get("text", "")).strip()


async def _extract_hosted_video_transcript(video_url: str) -> str:
    api_key = settings.groq_api_key.strip()
    if not api_key:
        return ""

    temp_id = uuid.uuid4().hex
    video_path = os.path.join(tempfile.gettempdir(), f"queztlearn-video-{temp_id}.tmp")
    audio_path = os.path.join(tempfile.gettempdir(), f"queztlearn-audio-{temp_id}.mp3")

    try:
        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
            response = await client.get(video_url)
            if not response.is_success:
                return ""
            with open(video_path, "wb") as f:
                f.write(response.content)

        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                video_path,
                "-vn",
                "-ac",
                "1",
                "-b:a",
                "64k",
                audio_path,
            ],
            capture_output=True,
            check=False,
        )
        if proc.returncode != 0:
            return ""

        return await asyncio.to_thread(_transcribe_audio_file, audio_path, api_key)
    except Exception:
        return ""
    finally:
        for path in (video_path, audio_path):
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except OSError:
                pass


async def extract_content_text(content: dict[str, Any]) -> str:
    parts: list[str] = []
    if content.get("title"):
        parts.append(str(content["title"]))
    if content.get("description"):
        parts.append(str(content["description"]))

    content_type = content.get("type")
    video_url = content.get("videoUrl")
    pdf_url = content.get("pdfUrl")
    markdown_body = content.get("markdownBody")
    external_url = content.get("externalUrl")

    if content_type == "Lecture" and video_url:
        if _is_youtube(video_url):
            transcript = await _extract_youtube_transcript(video_url)
            if transcript:
                parts.append(transcript)
        else:
            transcript = await _extract_hosted_video_transcript(video_url)
            if transcript:
                parts.append(transcript)
            parts.append(
                "\n".join(
                    [
                        "VIDEO LESSON (hosted video).",
                        f"Video URL: {video_url}",
                        (
                            "Transcript was auto-generated from hosted video audio."
                            if transcript
                            else "Transcript could not be generated from hosted video audio."
                        ),
                    ]
                )
            )
    elif content_type == "PDF" and pdf_url:
        pdf_text = await _extract_pdf_text(pdf_url)
        if pdf_text:
            parts.append(pdf_text)
    elif content_type == "MARKDOWN" and markdown_body:
        parts.append(str(markdown_body))
    elif content_type == "URL" and external_url:
        parts.append(f"External resource: {external_url}")

    return "\n\n".join(parts).strip()


async def index_content(content_id: str, batch_id: str, organization_id: str) -> None:
    def _load() -> dict[str, Any] | None:
        with db_conn() as conn:
            return conn.execute(
                """
                SELECT id, type, title, description, "videoUrl", "pdfUrl",
                       "markdownBody", "externalUrl"
                FROM contents
                WHERE id = %s
                """,
                (content_id,),
            ).fetchone()

    row = await asyncio.to_thread(_load)
    if not row:
        return

    extracted = await extract_content_text(dict(row))
    if extracted:

        def _save_text() -> None:
            with db_conn() as conn:
                conn.execute(
                    'UPDATE contents SET "extractedText" = %s WHERE id = %s',
                    (extracted, content_id),
                )
                conn.commit()

        await asyncio.to_thread(_save_text)

    await upsert_content_embeddings(content_id, batch_id, organization_id)
