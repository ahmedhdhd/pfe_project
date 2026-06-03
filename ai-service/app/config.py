from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    ai_service_internal_token: str = ""
    database_url: str = ""
    database_direct_url: str = Field(default="", validation_alias="DIRECT_URL")

    openrouter_api_key: str = ""
    openrouter_model: str = "deepseek/deepseek-chat-v3-0324"
    openrouter_embedding_model: str = "openai/text-embedding-3-large"
    openrouter_playground_model: str = ""
    openrouter_http_referer: str = "http://localhost:3000"
    openrouter_app_title: str = "QuetzLearn LMS"
    openrouter_summary_max_tokens: int = 1200
    openrouter_assignment_feedback_max_tokens: int = 1400
    openrouter_assignment_generation_max_tokens: int = 2200

    groq_api_key: str = ""

    embedding_dimensions: int = 3072
    rag_similarity_threshold: float = 0.52
    rag_top_k: int = 5

    @property
    def database_connection_url(self) -> str:
        """Prefer Supabase direct DB (DIRECT_URL) over pooler to avoid stale PgBouncer connections."""
        direct = self.database_direct_url.strip()
        if direct and "pooler.supabase.com" not in direct:
            return direct
        pooler = self.database_url.strip()
        if pooler:
            return pooler
        if direct:
            return direct
        return ""


settings = Settings()
