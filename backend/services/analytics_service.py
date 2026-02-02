"""
Analytics Service
Handles order analytics, revenue tracking, and statistics
"""

from services.supabase_service import get_supabase_client
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def get_analytics_overview(restaurant_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict:
    """
    Get overview analytics for a restaurant
    
    Returns:
    - Total orders
    - Total revenue
    - Average order value
    - Orders by status
    - Orders by source
    - Active orders count
    """
    supabase = get_supabase_client()
    
    # Build query
    query = supabase.table("orders").select("*").eq("restaurant_id", restaurant_id)
    
    # Apply date filters if provided
    if start_date:
        query = query.gte("created_at", start_date)
    if end_date:
        query = query.lte("created_at", end_date)
    
    result = query.execute()
    orders = result.data if result.data else []
    
    # Calculate metrics
    total_orders = len(orders)
    total_revenue = sum(float(order.get("total_amount", 0) or 0) for order in orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # Orders by status
    status_counts = {}
    for order in orders:
        status = order.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Orders by source
    source_counts = {}
    for order in orders:
        source = order.get("order_source", "voice")
        source_counts[source] = source_counts.get(source, 0) + 1
    
    # Active orders (pending, preparing, ready)
    active_orders = sum(1 for order in orders if order.get("status") in ["pending", "preparing", "ready"])
    
    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "average_order_value": round(avg_order_value, 2),
        "active_orders": active_orders,
        "orders_by_status": status_counts,
        "orders_by_source": source_counts
    }


def get_revenue_trends(restaurant_id: str, days: int = 30) -> List[Dict]:
    """
    Get revenue trends over time
    
    Returns list of daily revenue data
    """
    supabase = get_supabase_client()
    
    # Calculate start date
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Get orders
    result = supabase.table("orders").select("created_at, total_amount").eq(
        "restaurant_id", restaurant_id
    ).gte("created_at", start_date).order("created_at").execute()
    
    orders = result.data if result.data else []
    
    # Group by date
    daily_revenue = {}
    for order in orders:
        created_at = order.get("created_at")
        if created_at:
            # Extract date (YYYY-MM-DD)
            date = created_at.split("T")[0]
            amount = float(order.get("total_amount", 0) or 0)
            daily_revenue[date] = daily_revenue.get(date, 0) + amount
    
    # Convert to list format
    trends = [
        {"date": date, "revenue": round(amount, 2), "orders": 0}
        for date, amount in sorted(daily_revenue.items())
    ]
    
    # Count orders per day
    daily_orders = {}
    for order in orders:
        created_at = order.get("created_at")
        if created_at:
            date = created_at.split("T")[0]
            daily_orders[date] = daily_orders.get(date, 0) + 1
    
    # Add order counts
    for trend in trends:
        trend["orders"] = daily_orders.get(trend["date"], 0)
    
    return trends


def get_popular_items(restaurant_id: str, limit: int = 10, days: int = 30) -> List[Dict]:
    """
    Get most popular menu items
    
    Returns list of items with order count and total revenue
    """
    supabase = get_supabase_client()
    
    # Calculate start date
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Get orders with items
    orders_result = supabase.table("orders").select("id").eq(
        "restaurant_id", restaurant_id
    ).gte("created_at", start_date).execute()
    
    order_ids = [order["id"] for order in (orders_result.data or [])]
    
    if not order_ids:
        return []
    
    # Get order items
    items_result = supabase.table("order_items").select(
        "item_name, quantity, price"
    ).in_("order_id", order_ids).execute()
    
    items = items_result.data if items_result.data else []
    
    # Aggregate by item name
    item_stats = {}
    for item in items:
        item_name = item.get("item_name", "Unknown")
        quantity = int(item.get("quantity", 1))
        price = float(item.get("price", 0) or 0)
        
        if item_name not in item_stats:
            item_stats[item_name] = {
                "item_name": item_name,
                "total_quantity": 0,
                "total_revenue": 0,
                "order_count": 0
            }
        
        item_stats[item_name]["total_quantity"] += quantity
        item_stats[item_name]["total_revenue"] += price * quantity
        item_stats[item_name]["order_count"] += 1
    
    # Convert to list and sort by total quantity
    popular_items = list(item_stats.values())
    popular_items.sort(key=lambda x: x["total_quantity"], reverse=True)
    
    # Round revenue
    for item in popular_items:
        item["total_revenue"] = round(item["total_revenue"], 2)
    
    return popular_items[:limit]


def get_order_timeline(restaurant_id: str, days: int = 7) -> List[Dict]:
    """
    Get order timeline (orders by hour of day)
    
    Returns list of hourly order counts
    """
    supabase = get_supabase_client()
    
    # Calculate start date
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Get orders
    result = supabase.table("orders").select("created_at").eq(
        "restaurant_id", restaurant_id
    ).gte("created_at", start_date).execute()
    
    orders = result.data if result.data else []
    
    # Group by hour
    hourly_counts = {}
    for order in orders:
        created_at = order.get("created_at")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                hour = dt.hour
                hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
            except:
                pass
    
    # Convert to list format
    timeline = [
        {"hour": hour, "count": hourly_counts.get(hour, 0)}
        for hour in range(24)
    ]
    
    return timeline


def get_comprehensive_analytics(restaurant_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict:
    """
    Get comprehensive analytics for a restaurant
    
    Returns all analytics data in one call
    """
    overview = get_analytics_overview(restaurant_id, start_date, end_date)
    trends = get_revenue_trends(restaurant_id, days=30)
    popular_items = get_popular_items(restaurant_id, limit=10, days=30)
    timeline = get_order_timeline(restaurant_id, days=7)
    
    return {
        "overview": overview,
        "revenue_trends": trends,
        "popular_items": popular_items,
        "order_timeline": timeline
    }
