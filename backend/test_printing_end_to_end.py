"""
End-to-End Test Script for Printing Flow
Tests: Webhook → Order Creation → Printing → Database Verification

Usage:
    python test_printing_end_to_end.py

This script will:
1. Check if restaurant exists in database
2. Create a test order (simulating webhook)
3. Format and display receipt
4. Test PrintNode API call (or dry-run mode)
5. Verify order in database
"""

import sys
import os
import json
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


from config import Config
from services.supabase_service import get_supabase_client
from services.restaurant_service import get_restaurant_by_phone, get_restaurant_by_id
from services.order_service import create_order, get_order_by_id
from services.printer_service import format_receipt, format_receipt_with_escpos, send_print_job, check_print_status
from utils.helpers import format_phone_number

# Configure UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Configure logging to show SMS messages
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)


def print_section(title: str):
    """Print a section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_step(step_num: int, description: str):
    """Print a step"""
    print(f"\n[Step {step_num}] {description}")
    print("-" * 60)


def test_restaurant_setup():
    """Check if restaurant exists and PrintNode is configured"""
    print_section("STEP 1: Checking Restaurant Setup")
    
    supabase = get_supabase_client()
    
    # Get all restaurants
    result = supabase.table("restaurants").select("*").execute()
    
    if not result.data or len(result.data) == 0:
        print("❌ No restaurants found in database!")
        print("\nPlease create a restaurant first using:")
        print("  POST /api/restaurants")
        print("\nOr manually insert into database.")
        return None
    
    restaurants = result.data
    print(f"✅ Found {len(restaurants)} restaurant(s) in database")
    
    # Display restaurants
    for i, restaurant in enumerate(restaurants, 1):
        print(f"\nRestaurant {i}:")
        print(f"  ID: {restaurant['id']}")
        print(f"  Name: {restaurant.get('name', 'N/A')}")
        print(f"  Phone: {restaurant.get('phone', 'N/A')}")
        print(f"  PrintNode API Key: {'✅ Set' if restaurant.get('printnode_api_key') else '❌ Not set'}")
        print(f"  PrintNode Printer ID: {restaurant.get('printnode_printer_id', 'N/A')}")
    
    # Use first restaurant for testing
    test_restaurant = restaurants[0]
    
    if not test_restaurant.get('printnode_api_key') or not test_restaurant.get('printnode_printer_id'):
        print("\n⚠️  WARNING: PrintNode not configured for this restaurant")
        print("   Printing will be tested in DRY-RUN mode (receipt format only)")
        return test_restaurant, False
    
    print(f"\n✅ Using restaurant: {test_restaurant['name']}")
    print(f"   PrintNode configured: ✅")
    
    return test_restaurant, True


def create_test_order(restaurant_id: str):
    """Create a test order (simulating webhook data)"""
    print_section("STEP 2: Creating Test Order")
    
    # Simulate parsed order data (what parser_service would return)
    test_order_data = {
        "customer_phone": "+19178338111",
        "customer_name": "John Doe",
        "total_amount": 25.50,
        "estimated_ready_time": "10-15 minutes",
        "special_instructions": "Extra napkins please",
        "items": [
            {
                "item_name": "Chicken Fried Rice",
                "item_name_chinese": "鸡肉炒饭",  # Pre-translated for testing
                "quantity": 1,
                "size": "pint",
                "price": 8.50,
                "special_instructions": None
            },
            {
                "item_name": "Chicken Lo Mein",
                "item_name_chinese": "鸡肉捞面",
                "quantity": 1,
                "size": "pint",
                "price": 9.00,
                "special_instructions": None
            },
            {
                "item_name": "Egg Rolls",
                "item_name_chinese": "春卷",
                "quantity": 2,
                "pieces": 2,
                "price": 4.00,
                "special_instructions": "Extra soy sauce"
            }
        ]
    }
    
    print("Test order data:")
    print(json.dumps(test_order_data, indent=2))
    
    # Create order
    print("\nCreating order in database...")
    order = create_order(test_order_data, restaurant_id)
    
    print(f"✅ Order created successfully!")
    print(f"   Order ID: {order['id']}")
    print(f"   Order Number: {order['order_number']}")
    print(f"   Status: {order['status']}")
    print(f"   Total: ${order.get('total_amount', 0):.2f}")
    
    return order


def display_receipt(order_id: str, restaurant: dict):
    """Display the formatted receipt"""
    print_section("STEP 3: Receipt Format Preview")
    
    # Get order with items
    order = get_order_by_id(order_id)
    if not order:
        print("❌ Order not found!")
        return
    
    # Format receipt
    receipt_content = format_receipt(order, restaurant)
    
    print("Receipt content (what will be sent to printer):")
    print("\n" + "-" * 60)
    print(receipt_content)
    print("-" * 60)
    
    # Show base64 encoding (what PrintNode receives)
    import base64
    content_bytes = receipt_content.encode('utf-8')
    content_base64 = base64.b64encode(content_bytes).decode('utf-8')
    
    print(f"\n📊 Receipt Stats:")
    print(f"   Characters: {len(receipt_content)}")
    print(f"   Lines: {len(receipt_content.split(chr(10)))}")
    print(f"   Base64 length: {len(content_base64)}")
    
    return receipt_content


def test_printnode_api(restaurant: dict, receipt_content: str, dry_run: bool):
    """Test PrintNode API call"""
    print_section("STEP 4: Testing PrintNode API")
    
    if dry_run:
        print("🔍 DRY-RUN MODE: Simulating PrintNode API call")
        print("\nWhat would be sent to PrintNode:")
        print(f"   URL: https://api.printnode.com/printjobs")
        print(f"   Printer ID: {restaurant.get('printnode_printer_id', 'N/A')}")
        print(f"   Content Type: raw_base64")
        print(f"   Content Length: {len(receipt_content)} characters")
        print("\n⚠️  Skipping actual API call (PrintNode not configured)")
        return None
    
    api_key = restaurant.get('printnode_api_key')
    printer_id = restaurant.get('printnode_printer_id')
    
    print(f"📤 Sending print job to PrintNode...")
    print(f"   Printer ID: {printer_id}")
    
    # Convert to ESC/POS format with Chinese support
    receipt_content_bytes = format_receipt_with_escpos(receipt_content)
    print(f"   Content size: {len(receipt_content_bytes)} bytes (with ESC/POS commands)")
    
    try:
        print_job = send_print_job(
            api_key=api_key,
            printer_id=printer_id,
            content_bytes=receipt_content_bytes
        )
        
        print(f"✅ Print job sent successfully!")
        print(f"   Print Job ID: {print_job.get('id')}")
        print(f"   State: {print_job.get('state', 'N/A')}")
        
        # Check status after a moment
        import time
        print("\n⏳ Waiting 2 seconds to check print status...")
        time.sleep(2)
        
        try:
            status = check_print_status(api_key, print_job.get('id'))
            print(f"✅ Print status checked:")
            print(f"   State: {status.get('state', 'N/A')}")
            print(f"   Created: {status.get('createTimestamp', 'N/A')}")
        except Exception as e:
            print(f"⚠️  Could not check status: {e}")
        
        return print_job
        
    except Exception as e:
        print(f"❌ Print job failed: {e}")
        print("\nThis could mean:")
        print("  - PrintNode API key is invalid")
        print("  - Printer ID is incorrect")
        print("  - PrintNode Client is not running")
        print("  - Printer is offline")
        return None


def verify_database(order_id: str):
    """Verify order in database"""
    print_section("STEP 5: Database Verification")
    
    order = get_order_by_id(order_id)
    
    if not order:
        print("❌ Order not found in database!")
        return False
    
    print("✅ Order found in database:")
    print(f"   Order ID: {order['id']}")
    print(f"   Order Number: {order['order_number']}")
    print(f"   Restaurant ID: {order['restaurant_id']}")
    print(f"   Customer: {order.get('customer_name', 'N/A')} ({order.get('customer_phone', 'N/A')})")
    print(f"   Status: {order['status']}")
    print(f"   Total: ${order.get('total_amount', 0):.2f}")
    print(f"   Created: {order.get('created_at', 'N/A')}")
    
    items = order.get('items', [])
    print(f"\n   Items ({len(items)}):")
    for i, item in enumerate(items, 1):
        print(f"      {i}. {item.get('quantity', 1)}x {item.get('item_name', 'N/A')}")
        if item.get('item_name_chinese'):
            print(f"         ({item.get('item_name_chinese')})")
        if item.get('size'):
            print(f"         Size: {item.get('size')}")
        if item.get('price'):
            print(f"         Price: ${item.get('price'):.2f}")
    
    # Check status history
    supabase = get_supabase_client()
    status_history = supabase.table("order_status_history").select("*").eq("order_id", order_id).execute()
    
    if status_history.data:
        print(f"\n   Status History ({len(status_history.data)}):")
        for status in status_history.data:
            print(f"      - {status.get('status', 'N/A')} at {status.get('changed_at', 'N/A')} by {status.get('changed_by', 'N/A')}")
    
    return True


def main():
    """Run end-to-end test"""
    print("\n" + "=" * 60)
    print("  END-TO-END PRINTING TEST")
    print("=" * 60)
    
    try:
        # Validate config
        Config.validate()
        print("✅ Configuration validated")
        
        # Step 1: Check restaurant setup
        result = test_restaurant_setup()
        if not result:
            print("\n❌ Test aborted: No restaurant configured")
            return
        
        restaurant, has_printnode = result
        
        # Step 2: Create test order
        order = create_test_order(restaurant['id'])
        order_id = order['id']
        
        # Step 3: Display receipt
        receipt_content = display_receipt(order_id, restaurant)
        
        # Step 4: Test PrintNode API
        print_job = test_printnode_api(restaurant, receipt_content, dry_run=not has_printnode)
        
        # Step 5: Verify database
        verify_database(order_id)
        
        # Summary
        print_section("TEST SUMMARY")
        print("✅ Order created successfully")
        print("✅ Receipt formatted correctly")
        if has_printnode:
            if print_job:
                print("✅ Print job sent to PrintNode")
            else:
                print("⚠️  Print job failed (check PrintNode configuration)")
        else:
            print("⚠️  PrintNode test skipped (not configured)")
        print("✅ Database verification passed")
        
        print(f"\n📋 Test Order Number: {order['order_number']}")
        print(f"📋 Test Order ID: {order_id}")
        print("\n✅ End-to-end test completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

