from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    ai_service_internal_token: str = ""
    database_url: str = ""

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


settings = Settings()
