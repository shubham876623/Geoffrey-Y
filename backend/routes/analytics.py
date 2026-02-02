"""
Analytics API routes
Handles analytics endpoints for order statistics and revenue tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from services.analytics_service import (
    get_analytics_overview,
    get_revenue_trends,
    get_popular_items,
    get_order_timeline,
    get_comprehensive_analytics
)
from routes.auth import require_role
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/{restaurant_id}/overview")
async def get_overview(
    restaurant_id: str,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """
    Get analytics overview for a restaurant
    
    Returns:
    - Total orders
    - Total revenue
    - Average order value
    - Orders by status
    - Orders by source
    - Active orders count
    """
    try:
        # Check permissions for restaurant_admin
        if current_user["role"] == "restaurant_admin":
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            result = supabase.table("restaurant_users").select("restaurant_id").eq(
                "user_id", current_user["id"]
            ).eq("restaurant_id", restaurant_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=403, detail="Access denied to this restaurant")
        
        analytics = get_analytics_overview(restaurant_id, start_date, end_date)
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analytics overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{restaurant_id}/revenue-trends")
async def get_revenue_trends_endpoint(
    restaurant_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """Get revenue trends over time"""
    try:
        # Check permissions
        if current_user["role"] == "restaurant_admin":
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            result = supabase.table("restaurant_users").select("restaurant_id").eq(
                "user_id", current_user["id"]
            ).eq("restaurant_id", restaurant_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=403, detail="Access denied to this restaurant")
        
        trends = get_revenue_trends(restaurant_id, days)
        return {"trends": trends}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting revenue trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{restaurant_id}/popular-items")
async def get_popular_items_endpoint(
    restaurant_id: str,
    limit: int = Query(10, description="Number of items to return"),
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """Get most popular menu items"""
    try:
        # Check permissions
        if current_user["role"] == "restaurant_admin":
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            result = supabase.table("restaurant_users").select("restaurant_id").eq(
                "user_id", current_user["id"]
            ).eq("restaurant_id", restaurant_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=403, detail="Access denied to this restaurant")
        
        items = get_popular_items(restaurant_id, limit, days)
        return {"items": items}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting popular items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{restaurant_id}/timeline")
async def get_timeline_endpoint(
    restaurant_id: str,
    days: int = Query(7, description="Number of days to analyze"),
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """Get order timeline (orders by hour)"""
    try:
        # Check permissions
        if current_user["role"] == "restaurant_admin":
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            result = supabase.table("restaurant_users").select("restaurant_id").eq(
                "user_id", current_user["id"]
            ).eq("restaurant_id", restaurant_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=403, detail="Access denied to this restaurant")
        
        timeline = get_order_timeline(restaurant_id, days)
        return {"timeline": timeline}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{restaurant_id}/comprehensive")
async def get_comprehensive(
    restaurant_id: str,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    current_user: dict = Depends(require_role(["super_admin", "restaurant_admin"]))
):
    """
    Get comprehensive analytics (all metrics in one call)
    
    Returns overview, trends, popular items, and timeline
    """
    try:
        # Check permissions
        if current_user["role"] == "restaurant_admin":
            from services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            result = supabase.table("restaurant_users").select("restaurant_id").eq(
                "user_id", current_user["id"]
            ).eq("restaurant_id", restaurant_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=403, detail="Access denied to this restaurant")
        
        analytics = get_comprehensive_analytics(restaurant_id, start_date, end_date)
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting comprehensive analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
