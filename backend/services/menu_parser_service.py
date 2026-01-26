"""
Menu parser service - parses text menu files (TXT, PDF, CSV) using OpenAI
Simple and clean - handles text-based files only
"""

from openai import OpenAI
from config import Config
from typing import Dict
from services.menu_service import (
    create_category,
    create_menu_item,
    create_modifier,
    link_item_modifier
)
from services.supabase_service import get_supabase_client
import logging
import json
import os

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=Config.OPENAI_API_KEY) if Config.OPENAI_API_KEY else None


def update_menu_import_status(import_id: str, status: str, parsed_data: Dict = None, error_message: str = None):
    """
    Update menu import status in database
    
    Purpose:
    - Updates import status as file is processed
    - Stores parsed menu data when parsing completes
    - Stores error messages if parsing fails
    
    This function is specific to menu parsing workflow.
    """
    supabase = get_supabase_client()
    
    # Validate status
    allowed_statuses = ['pending', 'processing', 'completed', 'failed']
    if status not in allowed_statuses:
        raise ValueError(f"Invalid status. Must be one of: {', '.join(allowed_statuses)}")
    
    update_data = {
        "status": status
    }
    
    if parsed_data is not None:
        update_data["parsed_data"] = parsed_data
    
    if error_message is not None:
        update_data["error_message"] = error_message
    
    if status in ['completed', 'failed']:
        from datetime import datetime
        update_data["completed_at"] = datetime.utcnow().isoformat()
    
    try:
        logger.info(f"💾 Database update - Import ID: {import_id}")
        logger.info(f"   Status: {status}")
        if parsed_data is not None:
            total_items = len(parsed_data.get('items', []))
            for category in parsed_data.get('categories', []):
                total_items += len(category.get('items', []))
            logger.info(f"   Parsed data: {total_items} items (will save to parsed_data JSONB column)")
        if error_message is not None:
            logger.info(f"   Error message: {len(error_message)} characters (will save to error_message column)")
        
        result = supabase.table("menu_imports") \
            .update(update_data) \
            .eq("id", import_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise Exception("Failed to update menu import record - no data returned from database")
        
        updated_record = result.data[0]
        logger.info(f"✅ Database update successful for import {import_id}")
        logger.info(f"   Current status in DB: {updated_record.get('status')}")
        logger.info(f"   Has parsed_data: {'Yes' if updated_record.get('parsed_data') else 'No'}")
        logger.info(f"   Has error_message: {'Yes' if updated_record.get('error_message') else 'No'}")
        
        return updated_record
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"❌ Database update failed for import {import_id}: {e}", exc_info=True)
        raise Exception(f"Failed to update menu import: {str(e)}")


def parse_menu_file(import_id: str, file_path: str, file_type: str, restaurant_id: str) -> Dict:
    """
    Main function: Parse menu file and extract menu items
    
    Purpose:
    - Reads menu file (TXT, PDF, or CSV)
    - Extracts text content from file
    - Uses OpenAI to extract menu items, categories, prices, descriptions
    - Returns data in format matching database schema
    - Updates menu_import status and stores parsed data in database
 
    """
    logger.info(f"🚀 Starting menu parsing - Import ID: {import_id}, File: {file_path}, Type: {file_type}")
    
    if not client:
        error_msg = "OpenAI API key not configured"
        logger.error(f"❌ {error_msg}")
        raise Exception(error_msg)
    
    # Update status to processing
    try:
        logger.info(f"📝 Updating status to 'processing' in database...")
        update_menu_import_status(import_id, "processing")
        logger.info(f"✅ Status updated to 'processing'")
    except Exception as e:
        logger.error(f"❌ Error updating status to processing: {e}", exc_info=True)
    
    try:
        # Extract text from file based on type
        logger.info(f"📖 Reading {file_type} file: {file_path}")
        if not os.path.exists(file_path):
            raise Exception(f"File not found: {file_path}")
        
        if file_type == "text":
            menu_text = read_text_file(file_path)
        elif file_type == "pdf":
            menu_text = read_pdf_file(file_path)
        elif file_type == "csv":
            menu_text = read_csv_file(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}. Supported: text, pdf, csv")
        
        logger.info(f"✅ Extracted text: {len(menu_text)} characters, {len(menu_text.splitlines())} lines")
        
        # Build prompt for OpenAI
        logger.info(f"🤖 Building prompt for OpenAI...")
        prompt = build_menu_extraction_prompt(menu_text)
        logger.info(f"   Prompt length: {len(prompt)} characters")
        
        # Call OpenAI API (no timeout - wait until OpenAI finishes)
        logger.info(f"🤖 Calling OpenAI API (gpt-4o-mini)...")
        logger.info(f"   ⏳ Waiting for OpenAI to finish processing (no timeout)...")
        parsed_data = parse_with_openai(prompt)
        logger.info(f"✅ OpenAI API call completed")
        
        # Validate and count items
        if not isinstance(parsed_data, dict):
            raise Exception(f"OpenAI returned invalid data type: {type(parsed_data)}")
        
        # Count total items
        items_list = parsed_data.get('items', [])
        if not isinstance(items_list, list):
            items_list = []
        
        categories_list = parsed_data.get('categories', [])
        if not isinstance(categories_list, list):
            categories_list = []
        
        total_items = len(items_list)
        for category in categories_list:
            if isinstance(category, dict):
                cat_items = category.get('items', [])
                if isinstance(cat_items, list):
                    total_items += len(cat_items)
        
        logger.info(f"📊 Parsed {total_items} items from {len(categories_list)} categories")
        
        # Update status to completed with parsed data
        logger.info(f"💾 Saving parsed data to database...")
        update_menu_import_status(import_id, "completed", parsed_data=parsed_data)
        logger.info(f"✅ Parsed data saved to menu_imports.parsed_data")
        
        # Now create actual records in database tables
        logger.info(f"📝 Creating menu records in database tables...")
        created_records = create_menu_records_from_parsed_data(restaurant_id, parsed_data)
        logger.info(f"✅ Created {created_records['categories']} categories, {created_records['items']} items, {created_records['modifiers']} modifiers in database")
        logger.info(f"✅ Database updated successfully - Status: completed, Items: {total_items}")
        
        return parsed_data
        
    except Exception as e:
        error_message = str(e)
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"❌ Error parsing menu file: {error_message}")
        logger.error(f"   Traceback: {error_traceback}")
        
        # Update status to failed
        try:
            update_menu_import_status(import_id, "failed", error_message=f"{error_message}\n\n{error_traceback}")
            logger.info(f"✅ Status updated to 'failed'")
        except Exception as update_error:
            logger.error(f"❌ Error updating status to failed: {update_error}", exc_info=True)
        
        raise Exception(f"Failed to parse menu file: {error_message}")


def read_text_file(file_path: str) -> str:
    """Read text from .txt file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Failed to read text file: {str(e)}")


def read_pdf_file(file_path: str) -> str:
    """Extract text from PDF file"""
    try:
        pdf_text = ""
        
        # Method 1: Try PyPDF2
        try:
            import PyPDF2
            logger.info("   Using PyPDF2 to extract text from PDF...")
            with open(file_path, "rb") as f:
                pdf_reader = PyPDF2.PdfReader(f)
                num_pages = len(pdf_reader.pages)
                logger.info(f"   PDF has {num_pages} pages, extracting text...")
                for i, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        pdf_text += page_text + "\n"
                    if (i + 1) % 10 == 0:
                        logger.info(f"   Extracted text from {i + 1}/{num_pages} pages...")
        except ImportError:
            logger.info("   PyPDF2 not available, trying pdfplumber...")
        except Exception as e:
            logger.warning(f"   PyPDF2 extraction failed: {e}, trying pdfplumber...")
        
        # Method 2: Try pdfplumber if PyPDF2 didn't work
        if not pdf_text or len(pdf_text.strip()) < 50:
            try:
                import pdfplumber
                logger.info("   Using pdfplumber to extract text from PDF...")
                with pdfplumber.open(file_path) as pdf:
                    num_pages = len(pdf.pages)
                    logger.info(f"   PDF has {num_pages} pages (pdfplumber), extracting text...")
                    for i, page in enumerate(pdf.pages):
                        page_text = page.extract_text()
                        if page_text:
                            pdf_text += page_text + "\n"
                        if (i + 1) % 10 == 0:
                            logger.info(f"   Extracted text from {i + 1}/{num_pages} pages...")
            except ImportError:
                raise Exception("PDF text extraction requires PyPDF2 or pdfplumber. Install with: pip install PyPDF2 or pip install pdfplumber")
            except Exception as e:
                if not pdf_text:
                    raise Exception(f"Both PyPDF2 and pdfplumber failed to extract text: {str(e)}")
        
        if not pdf_text or len(pdf_text.strip()) < 50:
            raise Exception("Could not extract meaningful text from PDF. PDF might be image-based (scanned) or corrupted.")
        
        logger.info(f"   ✅ Extracted {len(pdf_text)} characters from PDF")
        return pdf_text
        
    except Exception as e:
        logger.error(f"❌ Error reading PDF file: {e}", exc_info=True)
        raise Exception(f"Failed to read PDF file: {str(e)}")


def read_csv_file(file_path: str) -> str:
    """Read text from CSV file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Failed to read CSV file: {str(e)}")


def parse_with_openai(prompt: str) -> Dict:
    """
    Use OpenAI text API to parse menu text
    
    Purpose:
    - Calls OpenAI text API to extract menu items from text
    - Returns structured menu data matching database schema
    - NO TIMEOUT - waits until OpenAI finishes processing
    
    """
    if not client:
        raise Exception("OpenAI client not initialized - check OPENAI_API_KEY in .env")
    
    try:
        logger.info(f"🤖 Sending request to OpenAI...")
        logger.info(f"   ⏳ No timeout - will wait until OpenAI finishes...")
        
        # No timeout parameter - will wait until OpenAI finishes
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a menu extraction expert. Extract menu items from text and return valid JSON only in the exact format specified."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
            # No timeout - waits until OpenAI finishes processing
        )
        
        if not response or not response.choices or len(response.choices) == 0:
            raise Exception("OpenAI API returned empty response")
        
        response_text = response.choices[0].message.content
        if not response_text:
            raise Exception("OpenAI API returned empty content")
        
        logger.info(f"✅ Received response: {len(response_text)} characters")
        
        # Parse JSON
        parsed_data = json.loads(response_text)
        logger.info(f"✅ JSON parsing successful")
        
        return parsed_data
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse JSON from OpenAI: {e}")
        logger.error(f"   Response: {response_text[:500] if 'response_text' in locals() else 'N/A'}")
        raise Exception(f"Failed to parse menu JSON: {e}")
    except Exception as e:
        logger.error(f"❌ OpenAI parsing error: {e}", exc_info=True)
        raise Exception(f"Error parsing menu with OpenAI: {str(e)}")


def build_menu_extraction_prompt(menu_text: str) -> str:
    """
    Build the prompt to send to OpenAI for menu extraction
    
    Purpose:
    - Creates clear prompt specifying exact JSON format needed
    - Matches database schema structure
    - Ensures consistent extraction format
    
    """
    return f"""Extract all menu items from this restaurant menu text and return JSON format.

Menu Text:
{menu_text}

Return JSON with this EXACT structure matching the database schema:

{{
  "categories": [
    {{
      "name": "category name (e.g., 'Appetizers', 'Main Dishes')",
      "items": [
        {{
          "name": "item name in English",
          "name_chinese": "Chinese translation (if available, otherwise null)",
          "description": "item description",
          "description_chinese": "Chinese description (if available, otherwise null)",
          "price": number (decimal, required - e.g., 12.99),
          "modifiers": [
            {{
              "name": "modifier name (e.g., 'Size', 'Spice Level', 'Add-ons')",
              "type": "single" or "multiple",
              "options": [
                {{
                  "name": "option name (e.g., 'Small', 'Large', 'Extra Spicy')",
                  "name_chinese": "Chinese translation (if available, otherwise null)",
                  "price_adjustment": number (decimal, can be 0, positive, or negative)
                }}
              ]
            }}
          ]
        }}
      ]
    }}
  ],
  "items": [
    {{
      "name": "item name (for items not in any category)",
      "name_chinese": "Chinese translation (if available, otherwise null)",
      "description": "item description",
      "description_chinese": "Chinese description (if available, otherwise null)",
      "price": number (decimal, required),
      "category": "category name (optional)"
    }}
  ]
}}

IMPORTANT REQUIREMENTS:
1. Extract ALL menu items from the text
2. Include prices for every item (required)
3. Group items by categories if menu is organized that way
4. Include modifiers (sizes, spice levels, add-ons) if present
5. If no categories, put all items in the "items" array
6. Return valid JSON only, no extra text or explanation
7. All prices must be numbers (decimals), not text

Extract everything: item names, prices, descriptions, categories, modifiers, and options.

Return valid JSON only."""


def create_menu_records_from_parsed_data(restaurant_id: str, parsed_data: Dict) -> Dict:
    """
    Create actual database records from parsed data
    
    Purpose:
    - Creates categories in menu_categories table
    - Creates items in menu_items table
    - Creates modifiers in menu_modifiers table
    - Creates modifier options in modifier_options table
    - Links items to modifiers in menu_item_modifiers table
    
    Returns:
    - Dict with counts of created records
    """
    supabase = get_supabase_client()
    created_counts = {
        'categories': 0,
        'items': 0,
        'modifiers': 0,
        'modifier_options': 0
    }
    
    category_id_map = {}  # Map category names to IDs
    
    try:
        # Step 1: Create categories
        categories = parsed_data.get('categories', [])
        for idx, category_data in enumerate(categories):
            category_name = category_data.get('name')
            if not category_name:
                continue
            
            # Check if category already exists
            existing = supabase.table("menu_categories") \
                .select("id") \
                .eq("restaurant_id", restaurant_id) \
                .eq("name", category_name) \
                .execute()
            
            if existing.data:
                category_id = existing.data[0]['id']
                logger.info(f"   Category '{category_name}' already exists (ID: {category_id})")
            else:
                # Create category
                category_record = {
                    "name": category_name,
                    "description": category_data.get('description'),
                    "display_order": idx,
                    "is_active": True
                }
                created_category = create_category(restaurant_id, category_record)
                category_id = created_category['id']
                logger.info(f"   ✅ Created category: {category_name} (ID: {category_id})")
                created_counts['categories'] += 1
            
            category_id_map[category_name] = category_id
        
        # Step 2: Create items (from categories)
        for category_data in categories:
            category_name = category_data.get('name')
            category_id = category_id_map.get(category_name)
            items = category_data.get('items', [])
            
            for idx, item_data in enumerate(items):
                if not item_data.get('name') or item_data.get('price') is None:
                    logger.warning(f"   ⚠️ Skipping item - missing name or price: {item_data}")
                    continue
                
                # Check if item already exists
                existing = supabase.table("menu_items") \
                    .select("id") \
                    .eq("restaurant_id", restaurant_id) \
                    .eq("name", item_data.get('name')) \
                    .execute()
                
                if existing.data:
                    item_id = existing.data[0]['id']
                    logger.info(f"   Item '{item_data.get('name')}' already exists (ID: {item_id})")
                else:
                    # Create menu item
                    item_record = {
                        "name": item_data.get('name'),
                        "name_chinese": item_data.get('name_chinese'),
                        "description": item_data.get('description'),
                        "description_chinese": item_data.get('description_chinese'),
                        "price": float(item_data.get('price')),
                        "category_id": category_id,
                        "display_order": idx,
                        "is_available": True
                    }
                    created_item = create_menu_item(restaurant_id, item_record)
                    item_id = created_item['id']
                    logger.info(f"   ✅ Created item: {item_data.get('name')} - ${item_data.get('price')} (ID: {item_id})")
                    created_counts['items'] += 1
                
                # Step 3: Create modifiers for this item
                modifiers = item_data.get('modifiers', [])
                for modifier_data in modifiers:
                    modifier_name = modifier_data.get('name')
                    if not modifier_name:
                        continue
                    
                    # Check if modifier already exists for this restaurant
                    existing_mod = supabase.table("menu_modifiers") \
                        .select("id") \
                        .eq("restaurant_id", restaurant_id) \
                        .eq("name", modifier_name) \
                        .execute()
                    
                    if existing_mod.data:
                        modifier_id = existing_mod.data[0]['id']
                        logger.info(f"      Modifier '{modifier_name}' already exists (ID: {modifier_id})")
                    else:
                        # Create modifier
                        modifier_record = {
                            "name": modifier_name,
                            "name_chinese": modifier_data.get('name_chinese'),
                            "type": modifier_data.get('type', 'single'),
                            "is_required": False,
                            "display_order": 0
                        }
                        created_modifier = create_modifier(restaurant_id, modifier_record)
                        modifier_id = created_modifier['id']
                        logger.info(f"      ✅ Created modifier: {modifier_name} (ID: {modifier_id})")
                        created_counts['modifiers'] += 1
                    
                    # Step 4: Create modifier options
                    options = modifier_data.get('options', [])
                    for opt_idx, option_data in enumerate(options):
                        option_name = option_data.get('name')
                        if not option_name:
                            continue
                        
                        # Check if option already exists
                        existing_opt = supabase.table("modifier_options") \
                            .select("id") \
                            .eq("modifier_id", modifier_id) \
                            .eq("name", option_name) \
                            .execute()
                        
                        if existing_opt.data:
                            logger.info(f"         Option '{option_name}' already exists")
                        else:
                            # Create modifier option
                            option_record = {
                                "modifier_id": modifier_id,
                                "name": option_name,
                                "name_chinese": option_data.get('name_chinese'),
                                "price_adjustment": float(option_data.get('price_adjustment', 0)),
                                "display_order": opt_idx,
                                "is_available": True
                            }
                            supabase.table("modifier_options").insert(option_record).execute()
                            logger.info(f"         ✅ Created option: {option_name} (price: ${option_data.get('price_adjustment', 0)})")
                            created_counts['modifier_options'] += 1
                    
                    # Step 5: Link item to modifier
                    try:
                        link_item_modifier(item_id, modifier_id)
                    except Exception as link_error:
                        logger.warning(f"      ⚠️ Could not link modifier to item: {link_error}")
        
        # Step 6: Create items not in categories
        items_not_in_categories = parsed_data.get('items', [])
        for idx, item_data in enumerate(items_not_in_categories):
            if not item_data.get('name') or item_data.get('price') is None:
                logger.warning(f"   ⚠️ Skipping item - missing name or price: {item_data}")
                continue
            
            # Check if item already exists
            existing = supabase.table("menu_items") \
                .select("id") \
                .eq("restaurant_id", restaurant_id) \
                .eq("name", item_data.get('name')) \
                .execute()
            
            if existing.data:
                item_id = existing.data[0]['id']
                logger.info(f"   Item '{item_data.get('name')}' already exists (ID: {item_id})")
            else:
                # Get category_id if category name provided
                category_id = None
                category_name = item_data.get('category')
                if category_name and category_name in category_id_map:
                    category_id = category_id_map[category_name]
                
                # Create menu item
                item_record = {
                    "name": item_data.get('name'),
                    "name_chinese": item_data.get('name_chinese'),
                    "description": item_data.get('description'),
                    "description_chinese": item_data.get('description_chinese'),
                    "price": float(item_data.get('price')),
                    "category_id": category_id,
                    "display_order": idx,
                    "is_available": True
                }
                created_item = create_menu_item(restaurant_id, item_record)
                item_id = created_item['id']
                logger.info(f"   ✅ Created item: {item_data.get('name')} - ${item_data.get('price')} (ID: {item_id})")
                created_counts['items'] += 1
            
            # Handle modifiers for items not in categories (same logic as above)
            modifiers = item_data.get('modifiers', [])
            for modifier_data in modifiers:
                modifier_name = modifier_data.get('name')
                if not modifier_name:
                    continue
                
                existing_mod = supabase.table("menu_modifiers") \
                    .select("id") \
                    .eq("restaurant_id", restaurant_id) \
                    .eq("name", modifier_name) \
                    .execute()
                
                if existing_mod.data:
                    modifier_id = existing_mod.data[0]['id']
                else:
                    modifier_record = {
                        "name": modifier_name,
                        "name_chinese": modifier_data.get('name_chinese'),
                        "type": modifier_data.get('type', 'single'),
                        "is_required": False,
                        "display_order": 0
                    }
                    created_modifier = create_modifier(restaurant_id, modifier_record)
                    modifier_id = created_modifier['id']
                    created_counts['modifiers'] += 1
                
                # Create options
                options = modifier_data.get('options', [])
                for opt_idx, option_data in enumerate(options):
                    option_name = option_data.get('name')
                    if not option_name:
                        continue
                    
                    existing_opt = supabase.table("modifier_options") \
                        .select("id") \
                        .eq("modifier_id", modifier_id) \
                        .eq("name", option_name) \
                        .execute()
                    
                    if not existing_opt.data:
                        option_record = {
                            "modifier_id": modifier_id,
                            "name": option_name,
                            "name_chinese": option_data.get('name_chinese'),
                            "price_adjustment": float(option_data.get('price_adjustment', 0)),
                            "display_order": opt_idx,
                            "is_available": True
                        }
                        supabase.table("modifier_options").insert(option_record).execute()
                        created_counts['modifier_options'] += 1
                
                # Link item to modifier
                try:
                    link_item_modifier(item_id, modifier_id)
                except Exception:
                    pass
        
        return created_counts
        
    except Exception as e:
        logger.error(f"❌ Error creating menu records: {e}", exc_info=True)
        # Return what was created so far
        return created_counts
