"""
Order parser service - uses OpenAI to parse natural language orders
Simple and clean structure
"""

from openai import OpenAI
from config import Config
from typing import Dict
import logging
import json

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=Config.OPENAI_API_KEY) if Config.OPENAI_API_KEY else None


def parse_order_data(webhook_data: Dict) -> Dict:
    """
    Main function: Parse order from SynthFlow webhook
    Returns structured order data with items, customer info, etc.
    """
    if not client:
        raise Exception("OpenAI API key not configured")
    
    # Step 1: Get transcript from webhook
    transcript = get_transcript(webhook_data)
    if not transcript:
        raise Exception("No transcript found in webhook data")
    
    # Step 2: Get customer info from webhook (PRIORITY - use webhook data first)
    customer_name = get_customer_name(webhook_data)
    customer_phone = get_customer_phone(webhook_data)
    
    # Step 3: Parse order using OpenAI
    parsed_order = parse_with_openai(transcript)
    
    # Step 4: Add customer info to parsed order
    # PRIORITY: Always use webhook phone_number over transcript-extracted phone
    # The webhook phone_number is the actual caller's number and is more reliable
    if customer_phone:
        parsed_order["customer_phone"] = customer_phone
    elif not parsed_order.get("customer_phone"):
        # Only use transcript phone if webhook doesn't have it
        parsed_order["customer_phone"] = ""
    
    if not parsed_order.get("customer_name"):
        parsed_order["customer_name"] = customer_name
    
    return parsed_order


def get_transcript(webhook_data: Dict) -> str:
    """Extract transcript from SynthFlow webhook"""
    # SynthFlow format: call.transcript
    call_data = webhook_data.get("call", {})
    if call_data and isinstance(call_data, dict):
        transcript = call_data.get("transcript")
        if transcript:
            return transcript
    
    return ""


def get_customer_phone(webhook_data: Dict) -> str:
    """Extract customer phone from SynthFlow webhook"""
    # SynthFlow format: lead.phone_number
    lead_data = webhook_data.get("lead", {})
    if lead_data and isinstance(lead_data, dict):
        phone = lead_data.get("phone_number")
        if phone:
            return phone
    
    return ""


def get_customer_name(webhook_data: Dict) -> str:
    """Extract customer name from SynthFlow webhook"""
    # SynthFlow format: lead.name
    lead_data = webhook_data.get("lead", {})
    if lead_data and isinstance(lead_data, dict):
        name = lead_data.get("name")
        if name:
            return name
    
    return ""


def parse_with_openai(transcript: str) -> Dict:
    """
    Use OpenAI to parse transcript into structured order data
    Returns: dict with items, customer info, total, etc.
    """
    try:
        # Build prompt for OpenAI
        prompt = build_parsing_prompt(transcript)
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a restaurant order parser. Always return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        # Get response text
        response_text = response.choices[0].message.content
        
        # Parse JSON
        parsed_data = json.loads(response_text)
        
        logger.info(f"Parsed order with {len(parsed_data.get('items', []))} items")
        
        return parsed_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from OpenAI: {e}")
        raise Exception(f"Failed to parse order JSON: {e}")
    except Exception as e:
        logger.error(f"OpenAI parsing error: {e}")
        raise Exception(f"Error parsing order: {e}")


def build_parsing_prompt(transcript: str) -> str:
    """Build the prompt to send to OpenAI"""
    return f"""Parse this restaurant order transcript and return JSON format.

Transcript: {transcript}

Return JSON with this exact structure:
{{
  "customer_name": "name or null",
  "customer_phone": "phone or null",
  "total_amount": number or null,
  "estimated_ready_time": "time estimate or null",
  "special_instructions": "special instructions or null",
  "items": [
    {{
      "item_name": "item name in English",
      "quantity": number,
      "size": "size like large/small or null",
      "pieces": number or null,
      "variant": "variant like spicy/mild or null",
      "special_instructions": "item instructions or null"
    }}
  ]
}}

IMPORTANT PHONE NUMBER RULES:
- If a phone number is mentioned in the transcript, extract it EXACTLY as spoken (digits only, no country code)
- DO NOT add any country code prefix like +91, +1, etc.
- Return phone number as digits only (e.g., "1234567890" not "+911234567890" or "+11234567890")
- If no phone number is mentioned, return null for customer_phone
- The system will format all phone numbers as US format (+1XXXXXXXXXX)

Extract all items with quantities, sizes, and pieces.
Return valid JSON only, no extra text."""
