"""
Menu API routes - handle menu management endpoints
Simple and clean
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.menu_service import (
    get_categories,
    create_category,
    update_category,
    delete_category,
    get_category_by_id
)
import logging

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
