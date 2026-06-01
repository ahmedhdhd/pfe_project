import asyncio
import os
import subprocess
import tempfile
import uuid

import httpx

from app.config import settings

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = "whisper-large-v3-turbo"


def _transcribe_audio_file_sync(audio_path: str, api_key: str) -> str:
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


def _extract_audio_to_mp3_sync(media_path: str, audio_path: str) -> None:
    proc = subprocess.run(
        [
            "ffmpeg",
            "-y",
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


def _transcribe_media_path_sync(media_path: str) -> str:
    api_key = settings.groq_api_key.strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set; cannot transcribe media")

    audio_path = os.path.join(tempfile.gettempdir(), f"queztlearn-audio-{uuid.uuid4().hex}.mp3")
    try:
        _extract_audio_to_mp3_sync(media_path, audio_path)
        return _transcribe_audio_file_sync(audio_path, api_key)
    finally:
        try:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
        except OSError:
            pass


async def transcribe_media_bytes(data: bytes, filename: str = "chunk.webm") -> str:
    suffix = os.path.splitext(filename)[1] or ".webm"
    media_path = os.path.join(tempfile.gettempdir(), f"queztlearn-media-{uuid.uuid4().hex}{suffix}")
    try:
        with open(media_path, "wb") as handle:
            handle.write(data)
        return await asyncio.to_thread(_transcribe_media_path_sync, media_path)
    finally:
        try:
            if os.path.exists(media_path):
                os.unlink(media_path)
        except OSError:
            pass
