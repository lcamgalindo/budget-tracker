import aiofiles
from pathlib import Path
from uuid import uuid4
from app.config import settings

async def save_receipt_image(image_bytes: bytes, original_filename: str) -> str:
    """Save receipt image to local storage, return relative path."""
    # Generate unique filename preserving extension
    ext = Path(original_filename).suffix or ".jpg"
    filename = f"{uuid4()}{ext}"
    relative_path = f"receipts/{filename}"
    full_path = settings.upload_dir / relative_path
    
    # Ensure directory exists
    full_path.parent.mkdir(parents=True, exist_ok=True)
    
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(image_bytes)
    
    return relative_path

def get_receipt_url(relative_path: str) -> str:
    """Get URL/path for serving the receipt image."""
    # For local dev, just return the path
    # In production, this could return a proper URL
    return f"/uploads/{relative_path}"