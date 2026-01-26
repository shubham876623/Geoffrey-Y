# Customer Ordering System - Development Plan

## 🎯 Project Overview

Build a complete customer self-service ordering system that adds menu management, customer ordering interface, and analytics to the existing voice order system.

**Key Requirements:**
- Simple, clean code (easy to understand and maintain)
- Fully functional for production
- Beautiful, fully responsive frontend (restaurant website feel)
- Task-by-task development (wait for approval before next task)
- Backend first, then frontend

---

## ✅ Client Confirmation (Jan 12, 2026)

**Confirmed Approach:**
1. **Menu Storage:** Menu stored ONLY in our database (`menu_items` table)
2. **SynthFlow Agent Access:** Agent accesses menu via our API (same database for both customer and agent)
3. **Automatic Price Lookup:** When voice orders come in (item names only), system automatically looks up prices from `menu_items` table
4. **Price Population:** Prices automatically populated in orders from our database
5. **Receipt:** Receipt shows all prices automatically (no agent needs to state prices)
6. **Bilingual Support:** 
   - Item names (English + Chinese) ✅ Already implemented
   - **NEW:** Size/Modifiers need Chinese translation ✅ Added to schema
   - **NEW:** Notes/Special instructions need Chinese translation ✅ Added to schema

---

## 📋 Task Status Tracker

### **PHASE 1: Database Schema Setup (Backend)**

- [x] **Task 1.1: Create Menu Categories Table** ✅ **COMPLETED**
  - Table: `menu_categories`
  - Status: Created in database
  - Date: Jan 12, 2026

- [x] **Task 1.2: Create Menu Items Table** ✅ **COMPLETED**
  - Table: `menu_items`
  - Status: Created in database
  - Date: Jan 12, 2026

- [x] **Task 1.3: Create Menu Modifiers Tables** ✅ **COMPLETED**
  - Tables: `menu_modifiers`, `modifier_options`, `menu_item_modifiers`
  - Status: Created in database
  - Date: Jan 12, 2026

- [x] **Task 1.4: Update Orders Table** ✅ **COMPLETED**
  - Added: `order_source`, `customer_session_id` to `orders` table
  - Added: `modifier_selections`, `size_chinese`, `special_instructions_chinese` to `order_items` table
  - Status: Schema updated (needs ALTER statements applied)
  - Date: Jan 12, 2026

- [x] **Task 1.5: Create Menu Imports Table** ✅ **COMPLETED**
  - Table: `menu_imports`
  - Status: Schema created (ready to apply)
  - Date: Jan 12, 2026
  - Priority: Optional (for tracking menu upload history)

---

### **PHASE 2: Menu Management API (Backend)**

- [x] **Task 2.1: Create Menu Categories Service** ✅ **COMPLETED**
- [x] **Task 2.2: Create Menu Categories API Endpoints** ✅ **COMPLETED**
- [x] **Task 2.3: Create Menu Items Service** ✅ **COMPLETED**
- [x] **Task 2.4: Create Menu Items API Endpoints** ✅ **COMPLETED**
  - [x] GET all items endpoint ✅
  - [x] GET single item endpoint ✅
  - [x] POST create item endpoint ✅
  - [x] PUT update item endpoint ✅
  - [x] DELETE item endpoint ✅
- [x] **Task 2.5: Create Menu Modifiers Service & API** ✅ **COMPLETED**
  - [x] get_modifiers function ✅
  - [x] get_modifier function ✅
  - [x] create_modifier function ✅
  - [x] update_modifier function ✅
  - [x] delete_modifier function ✅
  - [x] link_item_modifier function ✅
  - [x] unlink_item_modifier function ✅
  - [x] API endpoints ✅
    - [x] GET all modifiers endpoint ✅
    - [x] POST create modifier endpoint ✅
    - [x] PUT update modifier endpoint ✅
    - [x] DELETE modifier endpoint ✅
    - [x] POST link modifier endpoint ✅
    - [x] DELETE unlink modifier endpoint ✅

---

### **PHASE 3: Menu Upload & AI Parsing (Backend)**

- [x] **Task 3.1: Create Menu Upload Endpoint** ✅ **COMPLETED**
  - [x] Create menu upload service function ✅
  - [x] Create menu_import record function ✅
  - [x] Create update_menu_import_status function ✅
  - [x] Add upload endpoint ✅
  - [x] Handle file upload (PDF, image, CSV, text) ✅
  - [x] Save file temporarily ✅
  - [x] Create menu_import record ✅
  - [x] Return import_id for processing ✅
- [x] **Task 3.2: Create AI Parsing Service (Basic)** ✅ **COMPLETED**
  - [x] Create menu_parser_service.py file ✅
  - [x] Add parse_menu_file main function ✅
  - [x] Add file type routing (PDF, image, CSV, text) ✅
  - [x] Add OpenAI Vision API integration ✅
  - [x] Add OpenAI Text API integration ✅
  - [x] Add status update integration ✅
  - [x] Add structured JSON extraction ✅

---

### **PHASE 4: Customer Ordering API (Backend)**

- [x] **Task 4.1: Create Menu Retrieval API** ✅ **COMPLETED**
- [x] **Task 4.2: Create Self-Service Order Endpoint** ✅ **COMPLETED**
- [x] **Task 4.3: Add Automatic Price Lookup Function** ✅ **COMPLETED** ⚠️ **CLIENT REQUIREMENT**

---

### **PHASE 5: Menu Management UI (Frontend)**

- [ ] **Task 5.1: Setup Frontend Structure** ⏳ **PENDING**
- [ ] **Task 5.2: Create Menu Categories UI** ⏳ **PENDING**
- [ ] **Task 5.3: Create Menu Items UI** ⏳ **PENDING**
- [ ] **Task 5.4: Create Menu Upload UI** ⏳ **PENDING**

---

### **PHASE 6: Customer Ordering UI (Frontend)**

- [x] **Task 6.1: Create Menu Browse Page** ✅ **COMPLETED**
- [x] **Task 6.2: Create Item Detail Page** ✅ **COMPLETED**
- [x] **Task 6.3: Create Cart Page** ✅ **COMPLETED**
- [x] **Task 6.4: Create Order Confirmation Page** ✅ **COMPLETED**
- [x] **Task 6.5: Create Cart State Management** ✅ **COMPLETED**

---

### **PHASE 7: Analytics (Backend + Frontend)**

- [ ] **Task 7.1: Analytics Backend** ⏳ **PENDING**
- [ ] **Task 7.2: Analytics Dashboard UI** ⏳ **PENDING**

---

## 🔄 Client Changes & Updates

### **Update 1: Chinese Translation for Size and Notes (Jan 12, 2026)**
- **Requirement:** Add Chinese translation for size/modifiers and special instructions/notes
- **Status:** ✅ **COMPLETED** - Added to schema
- **Implementation:**
  - Added `size_chinese` column to `order_items` table
  - Added `special_instructions_chinese` column to `order_items` table
  - Added `name_chinese` to `menu_modifiers` and `modifier_options` tables

### **Update 2: Automatic Price Lookup (Jan 12, 2026)**
- **Requirement:** Agent should NOT state prices, but receipt should show all prices automatically from menu database
- **Status:** ⏳ **PENDING** - Task 4.3
- **Implementation Plan:**
  - Create function to look up menu item prices by name
  - Modify `create_order_items` to automatically populate prices
  - Prices come from `menu_items` table

---

## 📝 Notes

- **Current Focus:** Phase 1 - Database Schema Setup
- **Next Task:** Task 1.5 (Menu Imports Table) or Task 2.1 (Menu Categories Service)
- **Client Priority:** Automatic price lookup (Task 4.3) - important for production

---

## 📋 Development Phases

### **PHASE 1: Database Schema Setup (Backend)**
**Goal**: Create all database tables for menu management system

### **PHASE 2: Menu Management API (Backend)**
**Goal**: Create backend APIs for menu CRUD operations

### **PHASE 3: Menu Upload & AI Parsing (Backend)**
**Goal**: Create menu upload and AI parsing functionality

### **PHASE 4: Customer Ordering API (Backend)**
**Goal**: Create self-service order API

### **PHASE 5: Menu Management UI (Frontend)**
**Goal**: Beautiful admin interface for menu management

### **PHASE 6: Customer Ordering UI (Frontend)**
**Goal**: Beautiful, responsive customer ordering interface

### **PHASE 7: Analytics (Backend + Frontend)**
**Goal**: Analytics dashboard (if needed)

---

## 🔧 Coding Principles

### **Backend:**
- Simple, clean Python code
- Clear function names (no abbreviations)
- Easy to read and understand
- FastAPI for API endpoints
- Supabase for database

### **Frontend:**
- Beautiful, modern restaurant website design
- Fully responsive (mobile, tablet, desktop)
- Smooth animations and transitions
- Professional UI/UX
- React with Vite

---

## 📊 PHASE 1: Database Schema Setup (Backend)

### **Task 1.1: Create Menu Categories Table**
**Goal**: Create `menu_categories` table for organizing menu items

**Database Schema:**
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Steps:**
1. Add schema to `backend/database/schema.sql`
2. Add indexes for performance
3. Add RLS policies
4. Test table creation

**Deliverable**: ✅ `menu_categories` table created in database

---

### **Task 1.2: Create Menu Items Table** ✅ **COMPLETED**
**Goal**: Create `menu_items` table for storing menu items

**Status:** ✅ Completed - Table created in database

**Database Schema:**
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  category_id UUID REFERENCES menu_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Steps:**
1. Add schema to `backend/database/schema.sql`
2. Add indexes for performance
3. Add RLS policies
4. Test table creation

**Deliverable**: ✅ `menu_items` table created in database

---

### **Task 1.3: Create Menu Modifiers Tables** ✅ **COMPLETED**
**Goal**: Create tables for modifiers (sizes, add-ons, etc.)

**Status:** ✅ Completed - All 3 tables created in database

**Database Schema:**
```sql
CREATE TABLE menu_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'single' (radio) or 'multiple' (checkbox)
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE modifier_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modifier_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE menu_item_modifiers (
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, modifier_id)
);
```

**Steps:**
1. Add schemas to `backend/database/schema.sql`
2. Add indexes for performance
3. Add RLS policies
4. Test table creation

**Deliverable**: ✅ Modifier tables created in database (menu_modifiers, modifier_options, menu_item_modifiers)

---

### **Task 1.4: Update Orders Table** ✅ **COMPLETED**
**Goal**: Add columns for self-service orders

**Status:** ✅ Completed - Schema updated (ALTER statements ready to apply)

**Database Changes:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'voice';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS modifier_selections JSONB;
```

**Steps:**
1. Add ALTER statements to `backend/database/schema.sql`
2. Test column additions

**Deliverable**: ✅ Orders and order_items tables updated with:
- `order_source` and `customer_session_id` columns
- `modifier_selections`, `size_chinese`, `special_instructions_chinese` columns
- Index for `order_source`

---

### **Task 1.5: Create Menu Imports Table (Optional)** ⏳ **PENDING**
**Goal**: Track menu import history

**Status:** ⏳ Pending - Optional task

**Database Schema:**
```sql
CREATE TABLE menu_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  parsed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**Steps:**
1. Add schema to `backend/database/schema.sql`
2. Add indexes and RLS policies
3. Test table creation

**Deliverable**: `menu_imports` table created (optional for tracking)

---

## 📊 PHASE 2: Menu Management API (Backend)

### **Task 2.1: Create Menu Categories Service**
**Goal**: Create service functions for menu categories CRUD

**File**: `backend/services/menu_service.py`

**Functions:**
- `get_categories(restaurant_id)` - Get all categories for restaurant
- `create_category(restaurant_id, data)` - Create new category
- `update_category(category_id, data)` - Update category
- `delete_category(category_id)` - Delete category

**Steps:**
1. Create `menu_service.py` file
2. Implement get_categories function
3. Implement create_category function
4. Implement update_category function
5. Implement delete_category function
6. Add error handling

**Deliverable**: Menu categories service functions

---

### **Task 2.2: Create Menu Categories API Endpoints**
**Goal**: Create REST API endpoints for categories

**File**: `backend/routes/menu.py`

**Endpoints:**
- `GET /api/menu/{restaurant_id}/categories` - Get all categories
- `POST /api/menu/{restaurant_id}/categories` - Create category
- `PUT /api/menu/categories/{category_id}` - Update category
- `DELETE /api/menu/categories/{category_id}` - Delete category

**Steps:**
1. Create `menu.py` route file
2. Implement GET endpoint
3. Implement POST endpoint
4. Implement PUT endpoint
5. Implement DELETE endpoint
6. Add route to main.py
7. Test endpoints

**Deliverable**: Menu categories API endpoints

---

### **Task 2.3: Create Menu Items Service**
**Goal**: Create service functions for menu items CRUD

**File**: `backend/services/menu_service.py` (add to existing)

**Functions:**
- `get_menu_items(restaurant_id, category_id=None)` - Get items (optional category filter)
- `get_menu_item(item_id)` - Get single item with modifiers
- `create_menu_item(restaurant_id, data)` - Create new item
- `update_menu_item(item_id, data)` - Update item
- `delete_menu_item(item_id)` - Delete item

**Steps:**
1. Add functions to `menu_service.py`
2. Implement get_menu_items (with category filter)
3. Implement get_menu_item (with modifiers)
4. Implement create_menu_item
5. Implement update_menu_item
6. Implement delete_menu_item
7. Add error handling

**Deliverable**: Menu items service functions

---

### **Task 2.4: Create Menu Items API Endpoints**
**Goal**: Create REST API endpoints for menu items

**File**: `backend/routes/menu.py` (add to existing)

**Endpoints:**
- `GET /api/menu/{restaurant_id}/items` - Get all items (query: category_id)
- `GET /api/menu/items/{item_id}` - Get single item
- `POST /api/menu/{restaurant_id}/items` - Create item
- `PUT /api/menu/items/{item_id}` - Update item
- `DELETE /api/menu/items/{item_id}` - Delete item

**Steps:**
1. Add endpoints to `menu.py`
2. Implement GET all items endpoint
3. Implement GET single item endpoint
4. Implement POST endpoint
5. Implement PUT endpoint
6. Implement DELETE endpoint
7. Test endpoints

**Deliverable**: Menu items API endpoints

---

### **Task 2.5: Create Menu Modifiers Service & API**
**Goal**: Create service and API for modifiers

**File**: `backend/services/menu_service.py` + `backend/routes/menu.py`

**Functions:**
- `get_modifiers(restaurant_id)`
- `get_modifier(modifier_id)` (with options)
- `create_modifier(restaurant_id, data)`
- `update_modifier(modifier_id, data)`
- `delete_modifier(modifier_id)`
- `link_item_modifier(item_id, modifier_id)`
- `unlink_item_modifier(item_id, modifier_id)`

**Endpoints:**
- `GET /api/menu/{restaurant_id}/modifiers`
- `POST /api/menu/{restaurant_id}/modifiers`
- `PUT /api/menu/modifiers/{modifier_id}`
- `DELETE /api/menu/modifiers/{modifier_id}`
- `POST /api/menu/items/{item_id}/modifiers/{modifier_id}` (link)
- `DELETE /api/menu/items/{item_id}/modifiers/{modifier_id}` (unlink)

**Steps:**
1. Add modifier functions to service
2. Add modifier endpoints to routes
3. Test all endpoints

**Deliverable**: Menu modifiers service and API

---

## 📊 PHASE 3: Menu Upload & AI Parsing (Backend)

### **Task 3.1: Create Menu Upload Endpoint** ✅ **COMPLETED**
**Goal**: Accept menu file uploads (PDF, image, CSV, text)

**File**: `backend/routes/menu.py`, `backend/services/menu_service.py`

**Endpoint:**
- `POST /api/menu/{restaurant_id}/upload` - Upload menu file ✅

**Service Functions Created:**
- `create_menu_import()` - Creates menu_import record in database ✅
- `update_menu_import_status()` - Updates import status (for AI parser to use) ✅

**Steps:**
1. Add upload endpoint ✅
2. Handle file upload (PDF, image, CSV, text) ✅
3. Save file temporarily ✅
4. Create menu_import record ✅
5. Return import_id for processing ✅

**Deliverable**: Menu upload endpoint ✅

**What it does:**
- Accepts file uploads (PDF, JPG, PNG, CSV, TXT)
- Validates file type
- Saves file to `uploads/` directory with unique filename
- Creates menu_import record with status='pending'
- Returns import_id for tracking

**Why needed:**
- Allows restaurants to upload existing menu documents
- Initial menu setup automation
- Tracks upload history for debugging
- Stores file metadata for AI parser to process

---

### **Task 3.2: Create AI Parsing Service (Basic)** ✅ **COMPLETED**
**Goal**: Create structure for AI parsing (can be enhanced later)

**File**: `backend/services/menu_parser_service.py`

**Functions:**
- `parse_menu_file(import_id, file_path, file_type, restaurant_id)` - Main parsing function ✅
- `parse_pdf_file(file_path)` - Parse PDF files ✅
- `parse_image_file(file_path)` - Parse image files (JPG, PNG) ✅
- `parse_csv_file(file_path)` - Parse CSV files ✅
- `parse_text_file(file_path)` - Parse text files ✅
- `parse_with_openai_vision()` - Use OpenAI Vision API ✅
- `parse_with_openai_text()` - Use OpenAI Text API ✅
- `build_menu_extraction_prompt()` - Build standardized prompts ✅

**Steps:**
1. Create parser service file ✅
2. Create basic structure ✅
3. Add file type detection ✅
4. Add parsers for all file types ✅

**Deliverable**: Menu parser service structure ✅

**What it does:**
- Main function `parse_menu_file()` routes to appropriate parser based on file type
- Updates menu_import status: pending → processing → completed/failed
- Uses OpenAI Vision API for images/PDFs (gpt-4o)
- Uses OpenAI Text API for CSV/text files (gpt-4o-mini)
- Extracts menu items, prices, descriptions, categories, modifiers
- Returns structured JSON data for review and confirmation

**Why needed:**
- Automates menu extraction from uploaded documents
- Saves time - no manual entry needed
- Handles multiple file formats (PDF, images, CSV, text)
- Uses AI to accurately extract structured menu data
- Stores parsed data in database for review before confirmation

**How it works:**
1. Upload endpoint creates menu_import with status='pending'
2. Parser service called with import_id and file_path
3. Status updated to 'processing'
4. File type determined and routed to appropriate parser
5. AI extracts menu items, prices, descriptions
6. Status updated to 'completed' with parsed_data, or 'failed' with error_message
7. Restaurant staff reviews parsed_data and confirms items

---

## 📊 PHASE 4: Customer Ordering API (Backend)

- [x] **Task 4.1: Create Menu Retrieval API** ✅ **COMPLETED**
  - [x] Create get_public_menu service function ✅
  - [x] Add public menu endpoint ✅
  - [x] Fetch categories, items, modifiers, options ✅
  - [x] Organize response structure ✅
  - [x] Filter available items only ✅
  - [x] Attach modifiers to items ✅

### **Task 4.1: Create Menu Retrieval API** ✅ **COMPLETED**
**Goal**: Get menu for customer ordering (public endpoint)

**Status:** ✅ Completed

**File**: `backend/routes/menu.py`, `backend/services/menu_service.py`

**Endpoint:**
- `GET /api/menu/{restaurant_id}/public` - Get menu for ordering (categories, items, modifiers, options) ✅

**Service Function:**
- `get_public_menu(restaurant_id)` - Aggregates all menu data in customer-friendly format ✅

**Response Format:**
```json
{
  "success": true,
  "menu": {
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
}
```

**Steps:**
1. Add public menu endpoint ✅
2. Fetch categories, items, modifiers, options ✅
3. Organize response structure ✅
4. Filter available items only ✅
5. Attach modifiers to items ✅

**Deliverable**: Public menu retrieval API ✅

**What it does:**
- Retrieves all active categories for restaurant
- Retrieves all available menu items (is_available = true)
- Retrieves all modifiers with their options
- Links modifiers to items (through menu_item_modifiers table)
- Organizes items by category
- Returns items without category in separate array
- Public access - no authentication required

**Why needed:**
- Customer ordering: Frontend needs complete menu data to display menu
- Self-service ordering: Customers browse menu and select items
- Menu display: Shows categories, items with prices, descriptions, modifiers
- Public access: No authentication required - customers can view menu

**Real-world example:**
- Customer opens ordering page
- Frontend calls GET /api/menu/restaurant-123/public
- Gets all categories (Appetizers, Main Courses, Drinks) with their items
- Gets all items with prices, descriptions, and modifiers
- Gets all modifiers (Size, Spice Level) with their options
- Customer can browse menu, select items, and customize with modifiers

---

### **Task 4.2: Create Self-Service Order Endpoint** ✅ **COMPLETED**
**Goal**: Create order from customer self-service

**Status:** ✅ Completed

**File**: `backend/routes/orders.py`, `backend/services/order_service.py`

**Endpoint:**
- `POST /api/api/orders/self-service` - Create self-service order ✅

**Service Functions:**
- `create_self_service_order()` - Creates order with automatic price calculation ✅
- `create_self_service_order_items()` - Creates order items with modifiers ✅
- `calculate_modifier_price_adjustment()` - Calculates price adjustments from modifiers ✅

**What it does:**
- Accepts order with menu_item_id and modifier_selections
- Automatically calculates prices (base price + modifier adjustments)
- Calculates tax (7.25%) and total
- Sets order_source='self_service'
- Triggers print receipt automatically
- Sends SMS notification automatically
- Stores modifier_selections as JSONB

**Why needed:**
- Customer self-service ordering via frontend
- Same pipeline as voice orders (print + SMS)
- Automatic price calculation from menu database
- Full integration with existing order system

---

### **Task 4.3: Add Automatic Price Lookup Function** ✅ **COMPLETED** ⚠️ **CLIENT REQUIREMENT**
**Goal**: Automatically look up prices from menu_items table when orders come in

**Status:** ✅ Completed - **Important for production**

**Client Requirement (Jan 12, 2026):**
- Agent should NOT state prices during phone calls ✅
- Receipt should show all prices automatically ✅
- Prices must come from menu database automatically ✅

**Implementation:**
1. Create function: `get_menu_item_price(restaurant_id, item_name)` ✅
2. Modify `create_order_items` function to automatically look up prices ✅
3. If price not provided in order, look it up from `menu_items` table ✅
4. Store price in `order_items` table ✅
5. Receipt will automatically show prices ✅

**File:** `backend/services/menu_service.py` (new function) ✅
**File:** `backend/services/order_service.py` (modify create_order_items) ✅

**Deliverable**: Automatic price lookup working for voice orders ✅

**What it does:**
- When voice orders come in with item names only (no prices)
- System automatically searches `menu_items` table by name
- Uses fuzzy matching (exact match, then partial match)
- Automatically populates price in `order_items` table
- Receipts now show prices automatically
- Agent no longer needs to state prices during phone calls

**How it works:**
1. Voice order arrives: "I want 2 Spring Rolls" (no price)
2. `create_order_items()` is called with item: {item_name: "Spring Rolls", price: null}
3. System calls `get_menu_item_price(restaurant_id, "Spring Rolls")`
4. Function searches menu_items table:
   - First tries exact match (case-insensitive)
   - Then tries partial match (contains)
5. Finds "Spring Rolls" -> price $5.99
6. Automatically sets price: {item_name: "Spring Rolls", price: 5.99}
7. Receipt shows: "Spring Rolls x2 - $11.98"

**File**: `backend/routes/orders.py` (add to existing)

**Endpoint:**
- `POST /api/orders/self-service` - Create self-service order

**Request Format:**
```json
{
  "restaurant_id": "...",
  "items": [
    {
      "menu_item_id": "...",
      "quantity": 2,
      "modifier_selections": {...}
    }
  ],
  "customer_phone": "+1234567890",
  "customer_name": "John Doe"
}
```

**Steps:**
1. Add endpoint to orders.py
2. Validate request data
3. Calculate totals (items + modifiers + tax 7.25%)
4. Create order (order_source='self_service')
5. Create order_items with modifier_selections
6. Trigger print (reuse existing print_order)
7. Return order confirmation

**Deliverable**: Self-service order API endpoint

---

## 📊 PHASE 5: Menu Management UI (Frontend)

### **Task 5.1: Setup Frontend Structure**
**Goal**: Create menu management pages structure

**Files:**
- `frontend/src/pages/admin/MenuManagement.jsx`
- `frontend/src/pages/admin/MenuUpload.jsx`
- `frontend/src/pages/admin/Categories.jsx`
- `frontend/src/pages/admin/MenuItems.jsx`

**Steps:**
1. Create admin folder structure
2. Create basic page components
3. Setup routing
4. Add navigation

**Deliverable**: Frontend structure setup

---

### **Task 5.2: Create Menu Categories UI**
**Goal**: Beautiful UI for managing categories

**File**: `frontend/src/pages/admin/Categories.jsx`

**Features:**
- List categories
- Add new category
- Edit category
- Delete category
- Reorder categories

**Steps:**
1. Create categories list UI
2. Add create category form
3. Add edit category form
4. Add delete confirmation
5. Add drag-and-drop reordering (optional)
6. Style with restaurant theme

**Deliverable**: Menu categories management UI

---

### **Task 5.3: Create Menu Items UI**
**Goal**: Beautiful UI for managing menu items

**File**: `frontend/src/pages/admin/MenuItems.jsx`

**Features:**
- List menu items (grid/list view)
- Filter by category
- Search items
- Add new item
- Edit item
- Delete item
- Toggle availability
- Manage item modifiers

**Steps:**
1. Create items list/grid UI
2. Add category filter
3. Add search functionality
4. Add create item form
5. Add edit item form
6. Add delete confirmation
7. Add modifier management UI
8. Style beautifully

**Deliverable**: Menu items management UI

---

### **Task 5.4: Create Menu Upload UI**
**Goal**: Beautiful menu upload interface

**File**: `frontend/src/pages/admin/MenuUpload.jsx`

**Features:**
- Drag & drop file upload
- File type detection (PDF, image, CSV)
- Upload progress
- Preview parsed menu
- Edit parsed items before saving
- Save menu

**Steps:**
1. Create upload page UI
2. Add drag & drop functionality
3. Add file type validation
4. Add upload progress
5. Add preview UI
6. Add edit functionality
7. Add save functionality
8. Style beautifully

**Deliverable**: Menu upload UI

---

## 📊 PHASE 6: Customer Ordering UI (Frontend)

### **Task 6.1: Create Menu Browse Page** ✅ **COMPLETED**
**Goal**: Beautiful customer menu browsing page

**Status:** ✅ Completed

**File**: `frontend/src/pages/Menu.jsx`

**Features:**
- Category navigation (horizontal tabs) ✅
- Menu item cards (image, name, price, description) ✅
- Category filtering ✅
- Search functionality ✅
- Responsive design (mobile, tablet, desktop) ✅
- Beautiful restaurant website design (amber/orange theme) ✅
- Cart icon with item count ✅
- Click item to open detail modal ✅

**What it does:**
- Displays menu items organized by categories
- Allows filtering by category
- Search functionality for items
- Beautiful card-based layout
- Smooth hover animations
- Opens item modal for customization

**Deliverable**: Menu browse page ✅

---

### **Task 6.2: Create Item Detail Page** ✅ **COMPLETED**
**Goal**: Beautiful item detail modal/page

**Status:** ✅ Completed

**File**: `frontend/src/components/ItemModal.jsx`

**Features:**
- Large item image ✅
- Item name, description, price ✅
- Modifier selection (radio buttons for single, checkboxes for multiple) ✅
- Price adjustment display ✅
- Quantity selector ✅
- Add to cart button ✅
- Special instructions textarea ✅
- Beautiful modal design ✅

**What it does:**
- Opens as modal overlay when item is clicked
- Shows all item details and modifiers
- Allows customization with modifiers
- Calculates total price with adjustments
- Adds item to cart with all selections

**Deliverable**: Item detail modal ✅

---

### **Task 6.3: Create Cart Page** ✅ **COMPLETED**
**Goal**: Beautiful shopping cart page

**Status:** ✅ Completed

**File**: `frontend/src/pages/Cart.jsx`

**Features:**
- Display cart items with modifiers ✅
- Quantity adjustment (+/- buttons) ✅
- Remove items ✅
- Calculate subtotal ✅
- Calculate tax (7.25%) ✅
- Calculate total ✅
- Customer info form (name, phone) ✅
- Place order button ✅
- Beautiful design ✅

**What it does:**
- Shows all items in cart with details
- Allows quantity updates and item removal
- Collects customer information
- Calculates totals automatically
- Creates order via API
- Navigates to confirmation page

**Deliverable**: Cart page ✅

---

### **Task 6.4: Create Order Confirmation Page** ✅ **COMPLETED**
**Goal**: Beautiful order confirmation page

**Status:** ✅ Completed

**File**: `frontend/src/pages/OrderConfirmation.jsx`

**Features:**
- Display order number ✅
- Display order summary ✅
- Display estimated ready time ✅
- Display order status ✅
- Success animation ✅
- Beautiful design ✅

**What it does:**
- Shows order confirmation with success icon
- Displays order number prominently
- Shows order status and total
- Provides next steps information
- Button to return to menu

**Deliverable**: Order confirmation page ✅

---

### **Task 6.5: Create Cart State Management** ✅ **COMPLETED**
**Goal**: Cart state management (Context/State)

**Status:** ✅ Completed

**File**: `frontend/src/context/CartContext.jsx`

**Features:**
- Add to cart ✅
- Update quantity ✅
- Remove from cart ✅
- Calculate totals (subtotal, tax, total) ✅
- Persist to localStorage ✅
- Handle modifiers ✅

**What it does:**
- Manages cart state globally
- Persists cart to localStorage
- Calculates totals automatically
- Handles item quantities
- Supports modifier selections
- Provides cart functions to all components

**Deliverable**: Cart state management ✅

---

## 🎯 Development Workflow

### **Task-by-Task Process:**
1. **Review Task**: Read task description
2. **Write Code**: Implement task (simple, clean code)
3. **Test**: Test functionality
4. **Show Result**: Show completed code
5. **Wait for Approval**: Don't move to next task until you say "done" or "next"
6. **Next Task**: Only start next task after approval

### **Code Quality:**
- Simple, clean code
- Easy to understand
- Well-organized
- Error handling
- Comments where needed

### **Frontend Design:**
- Beautiful, modern design
- Restaurant website feel
- Fully responsive
- Smooth animations
- Professional UI/UX

---

## 📝 Notes

- Start with backend tasks first
- Complete one task at a time
- Wait for approval before next task
- Keep code simple and clean
- Frontend should be beautiful and responsive
- Test each task before moving forward

---

## ✅ Phase 6 Complete - Customer Ordering UI

**Completed Tasks:**
- ✅ Task 6.1: Menu Browse Page
- ✅ Task 6.2: Item Detail Modal
- ✅ Task 6.3: Cart Page
- ✅ Task 6.4: Order Confirmation Page
- ✅ Task 6.5: Cart State Management

**Features Implemented:**
- Beautiful, clean UI with amber/orange theme
- Full responsive design (tablet-first)
- Menu browsing with category filtering
- Search functionality
- Item customization with modifiers
- Shopping cart with quantity management
- Order checkout with customer info
- Order confirmation page
- Cart persistence (localStorage)
- Full API integration

**Routes:**
- `/menu` - Main menu browsing page (default)
- `/cart` - Shopping cart and checkout
- `/order-confirmation/:id` - Order confirmation page

**Environment Variables Needed:**
- `VITE_RESTAURANT_ID` - Restaurant ID for menu
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:8000)

---

---

## 📊 PHASE 8: Platform Admin Dashboard (Frontend)

### **Task 8.1: Platform Admin Dashboard Structure** ✅ **IN PROGRESS**
**Goal**: Create Platform Admin Dashboard with restaurant management, user management, and analytics

**Status:** 🔄 In Progress

**File**: `frontend/src/pages/AdminDashboard.jsx`

**Features:**
- Restaurant Management
  - View all restaurants (list/table)
  - Onboard new restaurants (form with PrintNode config)
  - View restaurant details
  - Display auto-generated restaurant admin credentials
- User Management
  - View all platform users
  - Create additional super admins
  - Update user passwords
  - Deactivate/delete users
  - Filter by role
- Monitoring & Analytics
  - Overview statistics (total restaurants, total users, active orders)
  - Recent activity logs
- Beautiful UI
  - Responsive design (mobile, tablet, desktop)
  - Advanced color scheme (indigo/purple/violet theme)
  - Smooth animations and transitions

**Steps:**
1. Create AdminDashboard component
2. Add navigation/sidebar
3. Implement restaurant management section
4. Implement user management section
5. Add overview statistics
6. Style beautifully

**Deliverable**: Complete Platform Admin Dashboard

---

---

## 📊 PHASE 9: Restaurant Admin Dashboard (Frontend)

### **Task 9.1: Restaurant Admin Dashboard Structure** ✅ **COMPLETED**
**Goal**: Create Restaurant Admin Dashboard with menu management, staff management, and orders view

**Status:** ✅ Completed

**File**: `frontend/src/pages/RestaurantDashboard.jsx`

**Features:**
- Overview Tab
  - Statistics cards (menu items, categories, staff users, active orders)
- Menu Management Tab
  - View/edit/delete categories
  - View/edit/delete menu items
  - View/edit/delete modifiers
  - Upload menu files (PDF, CSV, TXT) for AI parsing
  - Bilingual support (English/Chinese)
- Staff Management Tab
  - Create KDS users
  - Create FrontDesk users
  - Update staff passwords
  - Delete staff users
  - View all staff users
- Orders Tab
  - View all orders for restaurant
  - Order status display
  - Order details
- Beautiful UI
  - Responsive design (mobile, tablet, desktop)
  - Advanced color scheme (amber/orange/red theme)
  - Toast notifications
  - Smooth animations and transitions

**Deliverable**: Complete Restaurant Admin Dashboard ✅

---

## ✅ Ready to Start

**Next Phase**: Phase 5 - Menu Management UI (Admin) or Phase 7 - Analytics or Additional Features

**Completed Phases:**
- ✅ Phase 1: Database Schema Setup
- ✅ Phase 2: Menu Management API
- ✅ Phase 3: Menu Upload & AI Parsing
- ✅ Phase 4: Customer Ordering API
- ✅ Phase 6: Customer Ordering UI
- ✅ Phase 8: Platform Admin Dashboard
- ✅ Phase 9: Restaurant Admin Dashboard
