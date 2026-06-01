# QuetzLearn AI Service (FastAPI)

Standalone service for all LLM, RAG, embeddings, transcription, and playground generation.

## Run locally

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env     # set DATABASE_URL + AI_SERVICE_INTERNAL_TOKEN + keys
uvicorn app.main:app --reload --port 8000
```

## Express integration

In `backend/.env`:

```
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_INTERNAL_TOKEN=<same secret as ai-service>
```

Express has **no** OpenRouter/Groq/ffmpeg dependencies — all AI runs here.

Requires `ffmpeg` on PATH for video transcription (content indexing + live session chunks).

## Endpoints (internal)

- `POST /internal/v1/transcription/local-media` — multipart audio chunk (live sessions)

## Docker

```bash
docker build -t quetzlearn-ai-service ./ai-service
docker run --env-file ai-service/.env -p 8000:8000 quetzlearn-ai-service
```
