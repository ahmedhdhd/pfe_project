import asyncio
import logging
import os
import subprocess
import tempfile
import uuid

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = "whisper-large-v3-turbo"
MIN_TRANSCRIBE_BYTES = 512

MIME_BY_EXT: dict[str, tuple[str, str]] = {
    ".webm": ("chunk.webm", "audio/webm"),
    ".ogg": ("chunk.ogg", "audio/ogg"),
    ".wav": ("chunk.wav", "audio/wav"),
    ".mp3": ("chunk.mp3", "audio/mpeg"),
    ".m4a": ("chunk.m4a", "audio/mp4"),
    ".mp4": ("chunk.mp4", "audio/mp4"),
}


def _upload_name_and_mime(filename: str) -> tuple[str, str]:
    ext = os.path.splitext(filename)[1].lower()
    return MIME_BY_EXT.get(ext, ("chunk.webm", "audio/webm"))


def _transcribe_audio_file_sync(
    audio_path: str,
    api_key: str,
    *,
    upload_name: str = "audio.mp3",
    content_type: str = "audio/mpeg",
) -> str:
    with open(audio_path, "rb") as audio_file:
        files = {"file": (upload_name, audio_file, content_type)}
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


def _extract_audio_to_mp3_sync(media_path: str, audio_path: str) -> None:
    proc = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-fflags",
            "+genpts+discardcorrupt",
            "-err_detect",
            "ignore_err",
            "-i",
            media_path,
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
        stderr = proc.stderr.decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"ffmpeg failed: {stderr}")


def _transcribe_media_path_sync(media_path: str, filename: str) -> str:
    api_key = settings.groq_api_key.strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set; cannot transcribe media")

    upload_name, content_type = _upload_name_and_mime(filename)
    errors: list[str] = []

    try:
        text = _transcribe_audio_file_sync(
            media_path,
            api_key,
            upload_name=upload_name,
            content_type=content_type,
        )
        if text:
            return text
        errors.append("Groq returned empty text for raw media")
    except RuntimeError as exc:
        errors.append(f"Groq raw media: {exc}")

    audio_path = os.path.join(tempfile.gettempdir(), f"queztlearn-audio-{uuid.uuid4().hex}.mp3")
    try:
        _extract_audio_to_mp3_sync(media_path, audio_path)
        text = _transcribe_audio_file_sync(audio_path, api_key)
        if text:
            return text
        errors.append("Groq returned empty text after ffmpeg")
    except RuntimeError as exc:
        errors.append(f"ffmpeg path: {exc}")
    finally:
        try:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
        except OSError:
            pass

    raise RuntimeError("; ".join(errors))


async def transcribe_media_bytes(data: bytes, filename: str = "chunk.webm") -> str:
    if len(data) < MIN_TRANSCRIBE_BYTES:
        logger.info("Skipping transcription for small payload (%s bytes)", len(data))
        return ""

    suffix = os.path.splitext(filename)[1] or ".webm"
    media_path = os.path.join(tempfile.gettempdir(), f"queztlearn-media-{uuid.uuid4().hex}{suffix}")
    try:
        with open(media_path, "wb") as handle:
            handle.write(data)
        return await asyncio.to_thread(_transcribe_media_path_sync, media_path, filename)
    finally:
        try:
            if os.path.exists(media_path):
                os.unlink(media_path)
        except OSError:
            pass
