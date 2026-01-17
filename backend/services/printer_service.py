"""
Printer service - handles PrintNode cloud printing
Simple and clean structure
"""

import requests
import base64
from services.restaurant_service import get_restaurant_by_id
from services.order_service import get_order_by_id
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


def print_order(order_id: str) -> Dict:
    """
    Print order receipt using PrintNode API
    Gets restaurant's PrintNode credentials from database
    Returns print job info
    """
    # Get order with items
    order = get_order_by_id(order_id)
    if not order:
        raise Exception(f"Order {order_id} not found")
    
    # Get restaurant with PrintNode credentials
    restaurant_id = order.get("restaurant_id")
    restaurant = get_restaurant_by_id(restaurant_id)
    if not restaurant:
        raise Exception(f"Restaurant {restaurant_id} not found")
    
    # Check if PrintNode is configured
    printnode_api_key = restaurant.get("printnode_api_key")
    printnode_printer_id = restaurant.get("printnode_printer_id")
    
    if not printnode_api_key or not printnode_printer_id:
        raise Exception(f"PrintNode not configured for restaurant {restaurant.get('name')}")
    
    # Format receipt content (text)
    receipt_text = format_receipt(order, restaurant)
    
    # Convert to ESC/POS format with Chinese support
    receipt_content_bytes = format_receipt_with_escpos(receipt_text)
    
    # Send print job to PrintNode
    print_job = send_print_job(
        api_key=printnode_api_key,
        printer_id=printnode_printer_id,
        content_bytes=receipt_content_bytes
    )
    
    logger.info(f"Print job sent for order {order.get('order_number')}: {print_job.get('id')}")
    
    return print_job


def format_receipt_with_escpos(content: str) -> bytes:
    """
    Format content with ESC/POS commands to enable Chinese character printing
    Returns bytes ready for base64 encoding
    """
    # ESC/POS commands for Chinese character support
    # ESC @ - Initialize printer
    # FS & - Enable Chinese character mode (GB2312)
    # ESC t 16 - Select character code table 16 (GB2312 Simplified Chinese)
    
    esc_init = b'\x1B\x40'  # ESC @ - Initialize printer
    esc_chinese = b'\x1C\x26'  # FS & - Enable Chinese character mode
    esc_codetable = b'\x1B\x74\x10'  # ESC t 16 - Select code table 16 (GB2312)
    
    # Combine: Initialize + Enable Chinese + Set code table + Content
    # Encode content - try multiple encodings for Chinese support
    content_bytes = None
    
    # Try GB2312 first (most common for Chinese ESC/POS printers)
    try:
        import codecs
        codecs.lookup('gb2312')  # Check if encoding is available
        content_bytes = content.encode('gb2312', errors='ignore')
        logger.info("Using GB2312 encoding for Chinese characters")
    except (LookupError, UnicodeEncodeError):
        # Fallback to GB18030 (broader Chinese support, usually available)
        try:
            content_bytes = content.encode('gb18030', errors='ignore')
            logger.info("Using GB18030 encoding for Chinese characters")
        except (LookupError, UnicodeEncodeError):
            # Last resort: UTF-8 with proper ESC/POS commands
            # Some modern printers support UTF-8 if Chinese mode is enabled
            content_bytes = content.encode('utf-8', errors='ignore')
            logger.warning("Using UTF-8 encoding (may not work on all printers)")
    
    if content_bytes is None:
        # Ultimate fallback
        content_bytes = content.encode('utf-8', errors='ignore')
    
    # Add newline and cut command at the end
    newline = b'\n'
    cut_paper = b'\n\n\x1D\x56\x41\x03'  # ESC/POS cut paper command (partial cut)
    
    # Combine ESC/POS commands with content
    escpos_content = esc_init + esc_chinese + esc_codetable + content_bytes + newline + cut_paper
    
    return escpos_content


def format_receipt(order: Dict, restaurant: Dict) -> str:
    """
    Format order as receipt text for thermal printer
    Returns formatted string (will be converted to ESC/POS bytes later)
    """
    lines = []
    
    # Header
    lines.append("=" * 40)
    lines.append(restaurant.get("name", "RESTAURANT").center(40))
    lines.append("=" * 40)
    lines.append("")
    
    # Order info
    lines.append(f"Order: {order.get('order_number', 'N/A')}")
    lines.append(f"Date: {order.get('created_at', '')[:19]}")
    lines.append("")
    
    # Customer info
    customer_name = order.get("customer_name")
    customer_phone = order.get("customer_phone")
    if customer_name:
        lines.append(f"Customer: {customer_name}")
    if customer_phone:
        lines.append(f"Phone: {customer_phone}")
    lines.append("")
    
    # Items
    lines.append("-" * 40)
    lines.append("ITEMS")
    lines.append("-" * 40)
    
    items = order.get("items", [])
    for item in items:
        quantity = item.get("quantity", 1)
        item_name = item.get("item_name", "")
        size = item.get("size")
        pieces = item.get("pieces")
        price = item.get("price")
        
        # Format item line - Bilingual display
        item_line = f"{quantity}x {item_name}"
        if size:
            item_line += f" ({size})"
        if pieces:
            item_line += f" - {pieces} pieces"
        
        lines.append(item_line)
        
        # Chinese translation - always show if available
        item_name_chinese = item.get("item_name_chinese")
        if item_name_chinese:
            lines.append(f"  {item_name_chinese}")  # Chinese translation below English
        else:
            # If no Chinese translation, try to get it (shouldn't happen, but fallback)
            logger.warning(f"No Chinese translation for item: {item_name}")
        
        # Price if available - convert to float and check if not None
        if price is not None:
            try:
                price_float = float(price)
                lines.append(f"  ${price_float:.2f} each")
            except (ValueError, TypeError):
                logger.warning(f"Invalid price format for item {item_name}: {price}")
        
        # Special instructions
        if item.get("special_instructions"):
            lines.append(f"  Note: {item.get('special_instructions')}")
        
        lines.append("")
    
    # Calculate subtotal from items
    subtotal = 0.0
    items = order.get("items", [])
    for item in items:
        price = item.get("price")
        quantity = item.get("quantity", 1)
        if price is not None:
            try:
                price_float = float(price)
                subtotal += price_float * int(quantity)
            except (ValueError, TypeError):
                logger.warning(f"Invalid price format for item {item.get('item_name', 'unknown')}: {price}")
    
    # Calculate tax (default 7.25% - can be made configurable per restaurant)
    tax_rate = 0.0725  # 7.25% tax rate
    tax_amount = subtotal * tax_rate
    
    # Total should always be subtotal + tax for receipt display
    calculated_total = subtotal + tax_amount
    
    # Totals section
    lines.append("-" * 40)
    lines.append(f"SUBTOTAL: ${subtotal:.2f}")
    lines.append(f"TAX ({tax_rate*100:.2f}%): ${tax_amount:.2f}")
    lines.append("-" * 40)
    lines.append(f"TOTAL: ${calculated_total:.2f}")
    lines.append("-" * 40)
    lines.append("")
    
    # Estimated ready time
    estimated_time = order.get("estimated_ready_time")
    if estimated_time:
        lines.append(f"Ready in: {estimated_time}")
        lines.append("")
    
    # Special instructions
    special_instructions = order.get("special_instructions")
    if special_instructions:
        lines.append("Special Instructions:")
        lines.append(special_instructions)
        lines.append("")
    
    # Footer
    lines.append("=" * 40)
    lines.append("Thank you!")
    lines.append("=" * 40)
    
    return "\n".join(lines)


def send_print_job(api_key: str, printer_id: str, content_bytes: bytes) -> Dict:
    """
    Send print job to PrintNode API
    content_bytes: Already formatted ESC/POS bytes (with Chinese support)
    Returns print job response
    """
    url = "https://api.printnode.com/printjobs"
    
    # PrintNode uses API key as username with empty password for Basic Auth
    auth_string = f"{api_key}:"
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    headers = {
        "Authorization": f"Basic {auth_base64}",
        "Content-Type": "application/json"
    }
    
    # Encode ESC/POS bytes as base64 for PrintNode
    content_base64 = base64.b64encode(content_bytes).decode('utf-8')
    
    # Convert printer_id to int
    try:
        printer_id_int = int(printer_id)
    except (ValueError, TypeError):
        raise Exception(f"Invalid printer ID: {printer_id}")
    
    payload = {
        "printerId": printer_id_int,
        "title": "Order Receipt",
        "contentType": "raw_base64",
        "content": content_base64,
        "source": "voice-order-system"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        print_job = response.json()
        
        # Handle different response formats from PrintNode API
        # Sometimes returns just the ID (int), sometimes returns an object (dict)
        if isinstance(print_job, int):
            # If response is just the ID, create a dict structure
            print_job_id = print_job
            print_job = {"id": print_job_id}
        elif isinstance(print_job, dict):
            # Normal dict response
            print_job_id = print_job.get('id', print_job)
        else:
            # Fallback: use the response as ID
            print_job_id = print_job
            print_job = {"id": print_job_id}
        
        logger.info(f"Print job created: {print_job_id}")
        
        return print_job
        
    except requests.exceptions.RequestException as e:
        logger.error(f"PrintNode API error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response: {e.response.text}")
        raise Exception(f"Failed to send print job: {str(e)}")


def check_print_status(api_key: str, print_job_id: int) -> Dict:
    """
    Check status of a print job
    Returns print job status
    """
    url = f"https://api.printnode.com/printjobs/{print_job_id}"
    
    # PrintNode uses API key as username with empty password for Basic Auth
    auth_string = f"{api_key}:"
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    headers = {
        "Authorization": f"Basic {auth_base64}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"PrintNode API error checking status: {e}")
        raise Exception(f"Failed to check print status: {str(e)}")

