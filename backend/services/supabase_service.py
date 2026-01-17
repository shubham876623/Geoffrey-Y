"""
Supabase database service
Simple and clean database operations
"""

from supabase import create_client, Client
from config import Config
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)


def get_supabase_client():
    """Get Supabase client instance"""
    return supabase


def test_connection():
    """Test Supabase connection"""
    try:
        # Simple query to test connection
        result = supabase.table("restaurants").select("id").limit(1).execute()
        return True
    except Exception as e:
        logger.error(f"Supabase connection error: {e}")
        return False

