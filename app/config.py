from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Budget Tracker"
    debug: bool = True
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./budget_tracker.db"
    
    # Claude API
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-20250514"
    
    # Storage
    upload_dir: Path = Path("uploads")
    max_upload_size_mb: int = 10
    
    # Categorization
    category_confidence_threshold: float = 0.7  # Below this, flag for review
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure upload directory exists
settings.upload_dir.mkdir(exist_ok=True)