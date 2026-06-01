from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    organization_id: str = Field(validation_alias="organizationId")
    message: str
    history: list[ChatHistoryItem] = Field(default_factory=list)
    prompt_context: dict[str, Any] = Field(validation_alias="promptContext")
    batch_id: str = Field(validation_alias="batchId")

    model_config = {"populate_by_name": True}


class ChatResponse(BaseModel):
    reply_text: str = Field(alias="replyText")
    rag_chunks_used: int = Field(default=0, alias="ragChunksUsed")
    rag_status: str = Field(default="no_chunks", alias="ragStatus")

    model_config = {"populate_by_name": True}


class PlaygroundGenerateRequest(BaseModel):
    organization_id: str = Field(validation_alias="organizationId")
    concept: str
    instruction: str
    batch_name: str = Field(validation_alias="batchName")
    exam: str | None = None
    language: str | None = None

    model_config = {"populate_by_name": True}


class PlaygroundGenerateResponse(BaseModel):
    html: str


class ContentIndexRequest(BaseModel):
    content_id: str = Field(validation_alias="contentId")
    batch_id: str = Field(validation_alias="batchId")
    organization_id: str = Field(validation_alias="organizationId")

    model_config = {"populate_by_name": True}


class AssignmentFeedbackRequest(BaseModel):
    organization_id: str = Field(validation_alias="organizationId")
    prompt: str

    model_config = {"populate_by_name": True}


class AssignmentGenerateRequest(BaseModel):
    organization_id: str = Field(validation_alias="organizationId")
    generation_prompt: str = Field(validation_alias="generationPrompt")

    model_config = {"populate_by_name": True}


class ScheduleSummarizeRequest(BaseModel):
    organization_id: str = Field(validation_alias="organizationId")
    title: str
    transcript: str

    model_config = {"populate_by_name": True}


class ScheduleSummarizeResponse(BaseModel):
    summary: str


class TestOpenRouterRequest(BaseModel):
    api_key: str = Field(validation_alias="apiKey")
    model: str | None = None
    test_embeddings: bool = Field(default=False, validation_alias="testEmbeddings")

    model_config = {"populate_by_name": True}
