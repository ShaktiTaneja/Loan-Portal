import os
from supabase import create_client, Client

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # use service_role, never expose to frontend

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")

def supa() -> Client:
    """
    Returns a Supabase client instance.
    This client is used for all DB + Storage operations in the backend.
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)
