"""
Menu API routes - handle menu management endpoints
Simple and clean
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from services.menu_service import (
    get_categories,
    create_category,
    update_category,
    delete_category,
    get_category_by_id,
    get_menu_items,
    get_menu_item,
    create_menu_item,
    update_menu_item,
    delete_menu_item,
    get_modifiers,
    get_modifier,
    create_modifier,
    update_modifier,
    delete_modifier,
    link_item_modifier,
    unlink_item_modifier,
    create_menu_import,
    get_menu_imports,
    get_menu_import,
    get_public_menu
)
from services.menu_parser_service import parse_menu_file
import logging
import os
import uuid
from services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/menu", tags=["menu"])


# Request/Response Models
class CategoryCreateRequest(BaseModel):
    name: str
    description: str = None
    display_order: int = 0
    is_active: bool = True


class CategoryUpdateRequest(BaseModel):
    name: str = None
    description: str = None
    display_order: int = None
    is_active: bool = None


class MenuItemCreateRequest(BaseModel):
    name: str
    name_chinese: str = None
    description: str = None
    description_chinese: str = None
    price: float
    category_id: str = None
    image_url: str = None
    is_available: bool = True
    display_order: int = 0


class MenuItemUpdateRequest(BaseModel):
    name: str = None
    name_chinese: str = None
    description: str = None
    description_chinese: str = None
    price: float = None
    category_id: str = None
    image_url: str = None
    is_available: bool = None
    display_order: int = None


class ModifierCreateRequest(BaseModel):
    name: str
    name_chinese: str = None
    type: str  # 'single' or 'multiple'
    is_required: bool = False
    display_order: int = 0


class ModifierUpdateRequest(BaseModel):
    name: str = None
    name_chinese: str = None
    type: str = None
    is_required: bool = None
    display_order: int = None


# Category Endpoints
@router.get("/{restaurant_id}/categories")
async def get_menu_categories(restaurant_id: str):
    """
    Get all menu categories for a restaurant
    Returns list of active categories ordered by display_order
    """
    try:
        categories = get_categories(restaurant_id)
        return {
            "success": True,
            "categories": categories,
            "count": len(categories)
        }
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get categories: {str(e)}")


@router.post("/{restaurant_id}/categories")
async def create_menu_category(restaurant_id: str, request: CategoryCreateRequest):
    """
    Create a new menu category
    """
    try:
        category_data = {
            "name": request.name,
            "description": request.description,
            "display_order": request.display_order,
            "is_active": request.is_active
        }
        
        category = create_category(restaurant_id, category_data)
        
        return {
            "success": True,
            "category": category,
            "message": "Category created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating category: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create category: {str(e)}")


@router.put("/categories/{category_id}")
async def update_menu_category(category_id: str, request: CategoryUpdateRequest):
    """
    Update an existing menu category
    """
    try:
        # Only include fields that are provided (not None)
        category_data = {}
        if request.name is not None:
            category_data["name"] = request.name
        if request.description is not None:
            category_data["description"] = request.description
        if request.display_order is not None:
            category_data["display_order"] = request.display_order
        if request.is_active is not None:
            category_data["is_active"] = request.is_active
        
        if not category_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        category = update_category(category_id, category_data)
        
        return {
            "success": True,
            "category": category,
            "message": "Category updated successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating category: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")


@router.delete("/categories/{category_id}")
async def delete_menu_category(category_id: str):
    """
    Delete a menu category
    """
    try:
        delete_category(category_id)
        
        return {
            "success": True,
            "message": "Category deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting category: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete category: {str(e)}")


@router.get("/categories/{category_id}")
async def get_menu_category(category_id: str):
    """
    Get a single menu category by ID
    """
    try:
        category = get_category_by_id(category_id)
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {
            "success": True,
            "category": category
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting category: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get category: {str(e)}")


# Menu Items Endpoints
@router.get("/{restaurant_id}/items")
async def get_all_menu_items(restaurant_id: str, category_id: Optional[str] = Query(None)):
    """
    Get all menu items for a restaurant
    Optionally filter by category_id using query parameter
    Returns list of items ordered by display_order
    """
    try:
        items = get_menu_items(restaurant_id, category_id)
        return {
            "success": True,
            "items": items,
            "count": len(items)
        }
    except Exception as e:
        logger.error(f"Error getting menu items: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get menu items: {str(e)}")


@router.get("/items/{item_id}")
async def get_single_menu_item(item_id: str):
    """
    Get a single menu item by ID with its modifiers and options
    
    Why needed:
    - Customer ordering: When a customer clicks on a menu item, they need full details
      including all customization options (sizes, add-ons, modifiers)
    - Item detail page: Shows price, description, and all available modifiers
    - Cart functionality: Before adding to cart, we need to know all modifier options
      so customers can select their preferences
    """
    try:
        item = get_menu_item(item_id)
        
        if not item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        return {
            "success": True,
            "item": item
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting menu item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get menu item: {str(e)}")


@router.post("/{restaurant_id}/items")
async def create_menu_item_endpoint(restaurant_id: str, request: MenuItemCreateRequest):
    """
    Create a new menu item
    
    Why needed:
    - Admin menu management: Allows restaurant staff to add new items through admin UI
    - Menu upload/import: After parsing menu documents (PDF/image), this endpoint creates items
    - Manual entry: Staff can manually add items one by one when setting up menu
    - Initial setup: Essential for populating menu database when restaurant first starts using system
    """
    try:
        item_data = {
            "name": request.name,
            "name_chinese": request.name_chinese,
            "description": request.description,
            "description_chinese": request.description_chinese,
            "price": request.price,
            "category_id": request.category_id,
            "image_url": request.image_url,
            "is_available": request.is_available,
            "display_order": request.display_order
        }
        
        item = create_menu_item(restaurant_id, item_data)
        
        return {
            "success": True,
            "item": item,
            "message": "Menu item created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating menu item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create menu item: {str(e)}")


@router.put("/items/{item_id}")
async def update_menu_item_endpoint(item_id: str, request: MenuItemUpdateRequest):
    """
    Update an existing menu item
    
    Why needed:
    - Admin menu management: Allows restaurant staff to edit item details (name, price, description, availability)
    - Price changes: When prices change, staff can update without deleting and recreating items
    - Availability toggle: Quickly mark items as unavailable when temporarily out of stock
    - Menu corrections: Fix typos in names, descriptions, or update categories
    """
    try:
        # Only include fields that are provided (not None)
        item_data = {}
        if request.name is not None:
            item_data["name"] = request.name
        if request.name_chinese is not None:
            item_data["name_chinese"] = request.name_chinese
        if request.description is not None:
            item_data["description"] = request.description
        if request.description_chinese is not None:
            item_data["description_chinese"] = request.description_chinese
        if request.price is not None:
            item_data["price"] = request.price
        if request.category_id is not None:
            item_data["category_id"] = request.category_id
        if request.image_url is not None:
            item_data["image_url"] = request.image_url
        if request.is_available is not None:
            item_data["is_available"] = request.is_available
        if request.display_order is not None:
            item_data["display_order"] = request.display_order
        
        if not item_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        item = update_menu_item(item_id, item_data)
        
        return {
            "success": True,
            "item": item,
            "message": "Menu item updated successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating menu item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update menu item: {str(e)}")


@router.delete("/items/{item_id}")
async def delete_menu_item_endpoint(item_id: str):
    """
    Delete a menu item
    
    Why needed:
    - Admin menu management: Allows restaurant staff to remove items that are no longer on the menu
    - Menu cleanup: Delete obsolete items, seasonal items that are discontinued, or test items
    - Administrative control: Remove items that were added by mistake or have incorrect information
    """
    try:
        delete_menu_item(item_id)
        
        return {
            "success": True,
            "message": "Menu item deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting menu item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete menu item: {str(e)}")


# Menu Modifiers Endpoints
@router.get("/{restaurant_id}/modifiers")
async def get_all_modifiers(restaurant_id: str):
    """
    Get all modifiers for a restaurant
    Returns list of modifiers ordered by display_order
    """
    try:
        modifiers = get_modifiers(restaurant_id)
        return {
            "success": True,
            "modifiers": modifiers,
            "count": len(modifiers)
        }
    except Exception as e:
        logger.error(f"Error getting modifiers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get modifiers: {str(e)}")


@router.post("/{restaurant_id}/modifiers")
async def create_modifier_endpoint(restaurant_id: str, request: ModifierCreateRequest):
    """
    Create a new modifier
    """
    try:
        modifier_data = {
            "name": request.name,
            "name_chinese": request.name_chinese,
            "type": request.type,
            "is_required": request.is_required,
            "display_order": request.display_order
        }
        
        modifier = create_modifier(restaurant_id, modifier_data)
        
        return {
            "success": True,
            "modifier": modifier,
            "message": "Modifier created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating modifier: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create modifier: {str(e)}")


@router.put("/modifiers/{modifier_id}")
async def update_modifier_endpoint(modifier_id: str, request: ModifierUpdateRequest):
    """
    Update an existing modifier
    """
    try:
        # Only include fields that are provided (not None)
        modifier_data = {}
        if request.name is not None:
            modifier_data["name"] = request.name
        if request.name_chinese is not None:
            modifier_data["name_chinese"] = request.name_chinese
        if request.type is not None:
            modifier_data["type"] = request.type
        if request.is_required is not None:
            modifier_data["is_required"] = request.is_required
        if request.display_order is not None:
            modifier_data["display_order"] = request.display_order
        
        if not modifier_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        modifier = update_modifier(modifier_id, modifier_data)
        
        return {
            "success": True,
            "modifier": modifier,
            "message": "Modifier updated successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating modifier: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update modifier: {str(e)}")


@router.delete("/modifiers/{modifier_id}")
async def delete_modifier_endpoint(modifier_id: str):
    """
    Delete a modifier
    """
    try:
        delete_modifier(modifier_id)
        
        return {
            "success": True,
            "message": "Modifier deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting modifier: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete modifier: {str(e)}")


@router.post("/items/{item_id}/modifiers/{modifier_id}")
async def link_modifier_to_item(item_id: str, modifier_id: str):
    """
    Link a modifier to a menu item
    This allows the menu item to have that modifier available for customization
    """
    try:
        link_item_modifier(item_id, modifier_id)
        
        return {
            "success": True,
            "message": "Modifier linked to menu item successfully"
        }
    except Exception as e:
        logger.error(f"Error linking modifier to item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to link modifier: {str(e)}")


@router.delete("/items/{item_id}/modifiers/{modifier_id}")
async def unlink_modifier_from_item(item_id: str, modifier_id: str):
    """
    Unlink a modifier from a menu item
    This removes the customization option from that item
    """
    try:
        unlink_item_modifier(item_id, modifier_id)
        
        return {
            "success": True,
            "message": "Modifier unlinked from menu item successfully"
        }
    except Exception as e:
        logger.error(f"Error unlinking modifier from item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unlink modifier: {str(e)}")


# Menu Upload Endpoints
@router.post("/{restaurant_id}/upload")
async def upload_menu_file(
    restaurant_id: str,
    file: UploadFile = File(...)
):
    """
    Upload a text menu file
    
    Purpose:
    - Accepts text file uploads with restaurant menu text
    - Saves file temporarily for AI parsing
    - Creates menu_import record to track upload
    - OpenAI parses the text and extracts menu items in database format

    """
    try:
        # Accept text files, PDF, and CSV (all text-based)
        allowed_extensions = ['.txt', '.pdf', '.csv']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: TXT, PDF, CSV (text-based files only, no images)"
            )
        
        # Map extension to file type
        file_type_map = {
            '.txt': 'text',
            '.pdf': 'pdf',
            '.csv': 'csv'
        }
        file_type = file_type_map[file_extension]
        
        # Create uploads directory if it doesn't exist (relative to backend directory)
        # Get the directory where this file is located (backend/routes)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up one level to backend directory
        backend_dir = os.path.dirname(current_dir)
        uploads_dir = os.path.join(backend_dir, "uploads")
        
        # Create directory if it doesn't exist
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
            logger.info(f"Created uploads directory: {uploads_dir}")
        
        # Generate unique filename to avoid conflicts
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Save file
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            logger.info(f"Saved uploaded file {file.filename} to {file_path}")
        except Exception as e:
            logger.error(f"Error saving file to disk: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        # Create menu_import record (file_path is not stored in DB, file saved in uploads/)
        try:
            import_record = create_menu_import(
                restaurant_id=restaurant_id,
                file_name=file.filename,
                file_type=file_type
            )
        except Exception as e:
            logger.error(f"Error creating menu import record: {e}")
            # Try to delete the uploaded file if database insert fails
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Deleted uploaded file after database error: {file_path}")
            except:
                pass
            raise HTTPException(status_code=500, detail=f"Failed to create import record: {str(e)}")
        
        # Start parsing in background (don't block response)
        import_id = import_record["id"]
        try:
            # Run parsing in background thread (don't block response)
            def run_parsing():
                try:
                    logger.info("=" * 80)
                    logger.info(f"🚀 PARSING STARTED - Import ID: {import_id}")
                    logger.info(f"   File: {file_path}")
                    logger.info(f"   Restaurant ID: {restaurant_id}")
                    logger.info("=" * 80)
                    
                    result = parse_menu_file(import_id, file_path, file_type, restaurant_id)
                    
                    if result:
                        logger.info("=" * 80)
                        logger.info(f"✅ PARSING COMPLETED SUCCESSFULLY - Import ID: {import_id}")
                        total_items = len(result.get('items', []))
                        for category in result.get('categories', []):
                            total_items += len(category.get('items', []))
                        logger.info(f"   Total items extracted: {total_items}")
                        logger.info(f"   Categories: {len(result.get('categories', []))}")
                        logger.info(f"   Status: completed (parsed data saved to database)")
                        logger.info("=" * 80)
                    else:
                        logger.error("=" * 80)
                        logger.error(f"❌ PARSING RETURNED None - Import ID: {import_id}")
                        logger.error(f"   This indicates parsing failed - check logs above for errors")
                        logger.error("=" * 80)
                except Exception as parse_error:
                    import traceback
                    error_traceback = traceback.format_exc()
                    logger.error("=" * 80)
                    logger.error(f"❌ BACKGROUND PARSING EXCEPTION - Import ID: {import_id}")
                    logger.error(f"   Error: {parse_error}")
                    logger.error(f"   Full traceback:")
                    logger.error(error_traceback)
                    logger.error("=" * 80)
                    # Make sure status is updated even if parse_menu_file didn't catch it
                    try:
                        from services.menu_parser_service import update_menu_import_status
                        update_menu_import_status(import_id, "failed", error_message=f"Background parsing exception: {str(parse_error)}\n\n{error_traceback}")
                        logger.info(f"✅ Updated import {import_id} status to 'failed' in database")
                    except Exception as update_error:
                        logger.error(f"❌ Failed to update status after background parsing error: {update_error}", exc_info=True)
            
            # Use thread to run parsing in background
            import threading
            thread = threading.Thread(target=run_parsing, daemon=True)
            thread.start()
            logger.info(f"✅ Background parsing thread started for import {import_id}")
            
        except Exception as parse_init_error:
            logger.error(f"Failed to start background parsing: {parse_init_error}", exc_info=True)
            # Don't fail the upload if parsing can't start - user can trigger it manually later
        
        return {
            "success": True,
            "message": "File uploaded successfully. Parsing started in background.",
            "import": {
                "id": import_record["id"],
                "file_name": import_record["file_name"],
                "file_type": import_record["file_type"],
                "status": import_record["status"],
                "created_at": import_record["created_at"]
            }
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading menu file: {e}", exc_info=True)
        error_detail = str(e)
        # Include more helpful error message
        if "database" in error_detail.lower() or "supabase" in error_detail.lower():
            error_detail = f"Database error: {error_detail}"
        elif "permission" in error_detail.lower():
            error_detail = f"File permission error: {error_detail}"
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {error_detail}")


@router.get("/{restaurant_id}/uploads")
async def get_menu_uploads(
    restaurant_id: str,
    status: Optional[str] = Query(None, description="Filter by status: pending, processing, completed, failed")
):
    """
    Get all menu uploads for a restaurant
    
    Purpose:
    - Retrieves upload history for a restaurant
    - Allows admin/staff to see all uploaded files
    - Track upload status and processing history
    
    Why needed:
    - Upload history: See all files that were uploaded by restaurant
    - Status tracking: Check which uploads are pending, processing, completed, or failed
    - Admin dashboard: Display upload list in admin UI
    - Monitoring: See when files were uploaded and their current status
    
    What happens without it:
    - No way to see upload history after uploading
    - Can't check if upload was successful
    - Hard to track which files were uploaded
    - No visibility into upload status
    
    Real-world example:
    - Restaurant uploads menu.pdf at 2:00 PM
    - Admin checks upload history at 2:15 PM
    - Sees upload with status='processing'
    - After parsing completes, status updates to 'completed'
    - Admin can see all uploads with timestamps and statuses
    
    Query Parameters:
    - status (optional): Filter uploads by status (pending, processing, completed, failed)
    """
    try:
        imports = get_menu_imports(restaurant_id, status)
        
        return {
            "success": True,
            "imports": imports,
            "count": len(imports)
        }
    except Exception as e:
        logger.error(f"Error getting menu uploads: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get uploads: {str(e)}")


@router.get("/uploads/{import_id}")
async def get_menu_upload(import_id: str):
    """
    Get a single menu upload by ID
    
    Purpose:
    - Get detailed information about a specific upload
    - Check upload status, parsed data, and error messages
    - View extracted menu items before confirming
    
    Why needed:
    - Upload details: See full details of a specific upload
    - Status check: Check if upload is still processing or completed
    - View parsed data: See extracted menu items from AI parser before confirming
    - Error debugging: View error messages if parsing failed
    
    What happens without it:
    - Can't check status of a specific upload
    - Can't view parsed menu items before confirming
    - Hard to debug failed uploads without error details
    
    Real-world example:
    - Restaurant uploads file and gets import_id back
    - Admin checks import_id after a few minutes
    - If status='completed', can view parsed_data (extracted menu items)
    - If status='failed', can see error_message to fix the issue
    - Admin can then confirm or edit the parsed items
    """
    try:
        import_data = get_menu_import(import_id)
        
        if not import_data:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        return {
            "success": True,
            "import": import_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting menu upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get upload: {str(e)}")


@router.post("/uploads/{import_id}/parse")
async def trigger_parse_menu(import_id: str):
    """
    Manually trigger parsing for a pending menu import
    
    Purpose:
    - Parses a menu file that was uploaded but hasn't been parsed yet
    - Useful for retrying failed imports or parsing pending imports
    - Updates import status and stores parsed menu data
    
    Why needed:
    - Manual trigger: Parse imports that are stuck in 'pending' status
    - Retry failed: Re-parse imports that failed previously
    - Control: Give users control over when parsing happens
    
    Real-world example:
    - Upload completes with status='pending'
    - User wants to parse now instead of waiting for background job
    - Calls this endpoint to start parsing immediately
    """
    try:
        # Get import record to get file_path and other details
        import_data = get_menu_import(import_id)
        
        if not import_data:
            raise HTTPException(status_code=404, detail="Import not found")
        
        if import_data["status"] == "processing":
            raise HTTPException(status_code=400, detail="Import is already being processed")
        
        if import_data["status"] == "completed":
            return {
                "success": True,
                "message": "Import already completed",
                "import": import_data
            }
        
        # Get file path from uploads directory
        # Files are saved with UUID filename, but we don't store the path
        # We need to find the file - for now, we'll need file_path passed or reconstruct it
        # This is a limitation - we should store file_path or use a mapping
        
        # For now, we'll need the file to still exist in uploads/
        # TODO: Store file_path in database or use a consistent naming scheme
        
        raise HTTPException(
            status_code=501, 
            detail="Manual parsing requires file path. Please use automatic parsing which runs after upload, or re-upload the file."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering parse: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger parse: {str(e)}")


# Public Menu Endpoints (for Customer Ordering)
@router.get("/{restaurant_id}/public")
async def get_public_menu_endpoint(restaurant_id: str):
    """
    Get complete menu for customer ordering (public endpoint)
    
    Purpose:
    - Retrieves all menu data in a customer-friendly format
    - Returns categories, items (with modifiers), and modifiers organized for ordering
    - Public access - no authentication required
    
    Why needed:
    - Customer ordering: Frontend needs complete menu data to display menu to customers
    - Self-service ordering: Customers browse menu, select items, customize with modifiers
    - Menu display: Shows categories, items with prices, descriptions, and customization options
    - Public access: No authentication required - customers can view menu
    
    What happens without it:
    - No way for customers to view menu
    - Frontend can't display menu items
    - Can't build customer ordering interface
    - No public menu access
    
    Real-world example:
    - Customer opens ordering page
    - Frontend calls this endpoint
    - Gets all categories (Appetizers, Main Courses, Drinks)
    - Gets all items in each category with prices and descriptions
    - Gets all modifiers (Size, Spice Level) with their options
    - Customer can browse menu, select items, and customize with modifiers
    - Items are filtered to show only available items (is_available = true)
    
    Response Format:
    {
      "restaurant_id": "...",
      "categories": [
        {
          "id": "...",
          "name": "Appetizers",
          "description": "...",
          "items": [
            {
              "id": "...",
              "name": "Spring Rolls",
              "price": 5.99,
              "description": "...",
              "modifiers": [...]
            }
          ]
        }
      ],
      "items": [...],  // Items not in any category
      "modifiers": [...]  // All modifiers with options
    }
    """
    try:
        menu_data = get_public_menu(restaurant_id)
        
        return {
            "success": True,
            "menu": menu_data
        }
    except Exception as e:
        logger.error(f"Error getting public menu for restaurant {restaurant_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get public menu: {str(e)}")


@router.post("/{restaurant_id}/items/{item_id}/upload-image")
async def upload_item_image(
    restaurant_id: str,
    item_id: str,
    file: UploadFile = File(...)
):
    """
    Upload an image for a menu item
    
    Purpose:
    - Uploads image file to Supabase Storage
    - Returns the public URL of the uploaded image
    - Updates menu item with image_url
    """
    try:
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (max 5MB)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        
        # Upload to Supabase Storage
        supabase = get_supabase_client()
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_path = f"menu-items/{restaurant_id}/{item_id}/{file_id}{file_ext}"
        
        # Upload file
        try:
            storage_response = supabase.storage.from_("menu-images").upload(
                file_path,
                file_content,
                file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"}
            )
        except Exception as storage_error:
            # If bucket doesn't exist, try alternative: save to local uploads folder and return URL
            logger.warning(f"Storage upload error: {storage_error}. Using local storage fallback...")
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "menu-images")
            os.makedirs(uploads_dir, exist_ok=True)
            local_file_path = os.path.join(uploads_dir, f"{file_id}{file_ext}")
            with open(local_file_path, "wb") as f:
                f.write(file_content)
            # Return a URL that can be served by the backend
            from config import Config
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
            image_url = f"{base_url}/uploads/menu-images/{file_id}{file_ext}"
            updated_item = update_menu_item(item_id, {"image_url": image_url})
            return {
                "success": True,
                "image_url": image_url,
                "item": updated_item,
                "message": "Image uploaded successfully (local storage)"
            }
        
        # Get public URL
        try:
            public_url_response = supabase.storage.from_("menu-images").get_public_url(file_path)
            image_url = public_url_response
        except Exception as url_error:
            logger.error(f"Error getting public URL: {url_error}")
            # Construct URL manually from Supabase URL
            from config import Config
            # Supabase storage URL format: https://{project_ref}.supabase.co/storage/v1/object/public/{bucket}/{path}
            supabase_url = Config.SUPABASE_URL
            if supabase_url:
                # Extract project ref from URL (e.g., https://xxxxx.supabase.co -> xxxxx)
                project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
                image_url = f"https://{project_ref}.supabase.co/storage/v1/object/public/menu-images/{file_path}"
            else:
                # Fallback: use local storage URL
                base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
                image_url = f"{base_url}/uploads/menu-images/{file_id}{file_ext}"
        
        # Update menu item with image URL
        updated_item = update_menu_item(item_id, {"image_url": image_url})
        
        return {
            "success": True,
            "image_url": image_url,
            "item": updated_item,
            "message": "Image uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading item image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
