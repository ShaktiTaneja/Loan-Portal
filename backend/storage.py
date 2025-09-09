import uuid
from supa import supa

BUCKET = "docs"

def upload_bytes(app_id: str, filename: str, content: bytes) -> tuple[str,str]:
    """Upload file bytes to Supabase storage and return (url, key)."""
    key = f"{app_id}/{uuid.uuid4()}_{filename}"
    client = supa()
    client.storage.from_(BUCKET).upload(key, content)
    url = client.storage.from_(BUCKET).get_public_url(key)
    return url, key
