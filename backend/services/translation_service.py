"""
Translation service - uses OpenAI to translate English item names to Chinese
Simple and clean
"""

from openai import OpenAI
from config import Config
from typing import Optional, List, Dict
import logging
import json

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=Config.OPENAI_API_KEY) if Config.OPENAI_API_KEY else None

def get_chinese_translation(item_name: str) -> Optional[str]:
    """
    Get Chinese translation for an item name using OpenAI
    Returns Chinese name if successful, None otherwise
    """
    if not item_name or not client:
        return None
    
    try:
        # Use OpenAI to translate
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a translator. Translate restaurant menu items from English to Chinese. Return only the Chinese translation, nothing else."},
                {"role": "user", "content": f"Translate this restaurant menu item to Chinese: {item_name}"}
            ],
            temperature=0.1,
            max_tokens=50
        )
        
        chinese_name = response.choices[0].message.content.strip()
        
        # Remove quotes if present
        chinese_name = chinese_name.strip('"').strip("'")
        
        logger.info(f"Translated '{item_name}' to '{chinese_name}'")
        
        return chinese_name if chinese_name else None
        
    except Exception as e:
        logger.error(f"Translation error for '{item_name}': {e}")
        return None






def translate_batch(item_names: List[str]) -> Dict[str, str]:
    """
    Translate multiple items at once (more efficient)
    Returns dictionary: {english_name: chinese_name}
    """
    if not item_names or not client:
        return {}
    
    try:
        items_text = ", ".join(item_names)
        
        prompt = f"""Translate these restaurant menu items from English to Chinese.
Return JSON format: {{"item1": "chinese1", "item2": "chinese2", ...}}

Items: {items_text}

Return only valid JSON, no extra text."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a translator. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Clean up the translations
        translations = {}
        for key, value in result.items():
            clean_key = key.strip().lower()
            clean_value = str(value).strip().strip('"').strip("'")
            translations[clean_key] = clean_value
        
        logger.info(f"Translated {len(translations)} items")
        
        return translations
        
    except Exception as e:
        logger.error(f"Batch translation error: {e}")
        return {}
