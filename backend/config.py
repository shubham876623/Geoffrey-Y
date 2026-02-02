"""
Configuration module for loading environment variables
Simple and clean - no complex setup
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Application configuration"""
    
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # Twilio (optional - if using shared account)
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
    
    # Restaurant (optional - for single restaurant setup)
    RESTAURANT_ID = os.getenv("RESTAURANT_ID")
    
    # API Security
    KDS_API_KEY = os.getenv("KDS_API_KEY")
    ONBOARDING_API_KEY = os.getenv("ONBOARDING_API_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    
    # Webhook Security (optional)
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
    
    # Synthflow Integration
    # Update this with your actual Synthflow webhook URL
    # Format: https://workflow.synthflow.ai/api/v1/webhooks/{your-webhook-id}
    SYNTHFLOW_MENU_WEBHOOK_URL = os.getenv(
        "SYNTHFLOW_MENU_WEBHOOK_URL",
        "https://workflow.synthflow.ai/api/v1/webhooks/EyXDXnhLYM26DysMw88mh"
    )
    
    # OpenAI (required - for parsing and translation)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required in .env file")
        if not cls.SUPABASE_URL or not cls.SUPABASE_KEY:
            raise ValueError("Supabase credentials are required in .env file")
    
    # Server
    PORT = int(os.getenv("PORT", 8000))
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

