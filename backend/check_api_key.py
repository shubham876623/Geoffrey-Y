-- Voice Order System Database Schema
-- Supabase PostgreSQL Database

-- Restaurants table (for multi-tenant support)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,  -- Restaurant phone number (used to identify restaurant from SynthFlow)
  printnode_printer_id TEXT,  -- PrintNode printer ID (per restaurant)
  printnode_api_key TEXT,  -- PrintNode API key (per restaurant, stored securely)
  twilio_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for phone lookup
CREATE INDEX idx_restaurants_phone ON restaurants(phone);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  order_number TEXT NOT NULL UNIQUE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, preparing, ready, completed
  total_amount DECIMAL(10,2),
  estimated_ready_time TEXT, -- e.g., "10-15 minutes"
  special_instructions TEXT,
  order_source TEXT DEFAULT 'voice', -- 'voice' or 'self_service'
  customer_session_id TEXT, -- Optional: for tracking customer sessions
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  printed_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_name_chinese TEXT, -- Chinese translation for bilingual display
  quantity INTEGER DEFAULT 1,
  size TEXT, -- e.g., "large", "small", "pint", "quart"
  size_chinese TEXT, -- Chinese translation for size (client requirement)
  pieces INTEGER, -- e.g., 8 for "8 pieces chicken wings"
  variant TEXT, -- Additional variant info (e.g., "spicy", "mild")
  price DECIMAL(10,2),
  special_instructions TEXT,
  special_instructions_chinese TEXT, -- Chinese translation for special instructions (client requirement)
  modifier_selections JSONB, -- Stores selected modifiers from self-service orders (e.g., {"size": "large", "add_ons": ["extra_sauce"]})
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order status history (for tracking)
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  changed_by TEXT -- 'system', 'kitchen', etc.
);

-- Indexes for performance
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Enable Row Level Security (RLS)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on restaurants" ON restaurants
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on orders" ON orders
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on order_items" ON order_items
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on order_status_history" ON order_status_history
  FOR ALL USING (true);

-- Enable Realtime on orders table (for frontend subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================
-- CUSTOMER ORDERING SYSTEM - MENU TABLES
-- ============================================

-- Menu Categories table
-- Stores categories for organizing menu items (e.g., "Appetizers", "Main Courses", "Drinks")
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for menu_categories
CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX idx_menu_categories_display_order ON menu_categories(restaurant_id, display_order);
CREATE INDEX idx_menu_categories_is_active ON menu_categories(restaurant_id, is_active);

-- Enable Row Level Security for menu_categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy for menu_categories (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on menu_categories" ON menu_categories
  FOR ALL USING (true);

-- Menu Items table
-- Stores individual menu items with prices (used for automatic price lookup and customer ordering)
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_chinese TEXT,  -- Chinese translation for bilingual support
  description TEXT,
  description_chinese TEXT,  -- Chinese translation for description
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for menu_items
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_name ON menu_items(restaurant_id, name);  -- For price lookup by name
CREATE INDEX idx_menu_items_is_available ON menu_items(restaurant_id, is_available);
CREATE INDEX idx_menu_items_display_order ON menu_items(category_id, display_order);

-- Enable Row Level Security for menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy for menu_items (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on menu_items" ON menu_items
  FOR ALL USING (true);

-- Menu Modifiers table
-- Stores modifiers like "Size", "Spice Level", "Add-ons" that can be applied to menu items
CREATE TABLE menu_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_chinese TEXT,  -- Chinese translation for bilingual support
  type TEXT NOT NULL,  -- 'single' (radio/select) or 'multiple' (checkboxes)
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Modifier Options table
-- Stores individual options for modifiers (e.g., "Small", "Large" for Size modifier)
CREATE TABLE modifier_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modifier_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_chinese TEXT,  -- Chinese translation for bilingual support
  price_adjustment DECIMAL(10,2) DEFAULT 0,  -- Additional cost for this option
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Menu Item Modifiers junction table
-- Links menu items to their available modifiers (many-to-many relationship)
CREATE TABLE menu_item_modifiers (
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, modifier_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for menu_modifiers
CREATE INDEX idx_menu_modifiers_restaurant_id ON menu_modifiers(restaurant_id);
CREATE INDEX idx_menu_modifiers_display_order ON menu_modifiers(restaurant_id, display_order);

-- Indexes for modifier_options
CREATE INDEX idx_modifier_options_modifier_id ON modifier_options(modifier_id);
CREATE INDEX idx_modifier_options_display_order ON modifier_options(modifier_id, display_order);

-- Indexes for menu_item_modifiers
CREATE INDEX idx_menu_item_modifiers_menu_item_id ON menu_item_modifiers(menu_item_id);
CREATE INDEX idx_menu_item_modifiers_modifier_id ON menu_item_modifiers(modifier_id);

-- Enable Row Level Security for modifier tables
ALTER TABLE menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modifier tables (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on menu_modifiers" ON menu_modifiers
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on modifier_options" ON modifier_options
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on menu_item_modifiers" ON menu_item_modifiers
  FOR ALL USING (true);

-- ============================================
-- UPDATE EXISTING TABLES FOR SELF-SERVICE ORDERS
-- ============================================

-- Add order_source column to orders table (if not exists)
-- This column tracks whether order came from voice or self-service
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'voice';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_session_id TEXT;

-- Add modifier_selections and Chinese translations to order_items table (if not exists)
-- modifier_selections: Stores selected modifiers in JSON format for self-service orders
-- size_chinese: Chinese translation for size (client requirement)
-- special_instructions_chinese: Chinese translation for special instructions (client requirement)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS modifier_selections JSONB;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_chinese TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS special_instructions_chinese TEXT;

-- Add index for order_source (for filtering orders by source)
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(restaurant_id, order_source);

-- Menu Imports table
-- Tracks menu upload/import history (optional but useful for debugging and tracking)
CREATE TABLE menu_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- 'pdf', 'image', 'csv', 'text'
  status TEXT NOT NULL,  -- 'pending', 'processing', 'completed', 'failed'
  parsed_data JSONB,  -- Stores parsed menu data before confirmation
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes for menu_imports
CREATE INDEX idx_menu_imports_restaurant_id ON menu_imports(restaurant_id);
CREATE INDEX idx_menu_imports_status ON menu_imports(restaurant_id, status);
CREATE INDEX idx_menu_imports_created_at ON menu_imports(restaurant_id, created_at DESC);

-- Enable Row Level Security for menu_imports
ALTER TABLE menu_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policy for menu_imports (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on menu_imports" ON menu_imports
  FOR ALL USING (true);


1.	types
postcode,address,locality,neighborhood,place
2.	language
en
3.	limit
8
4.	autocomplete
false
5.	proximity
-74.70850,40.78375
6.	access_token
pk.eyJ1IjoiZnJvbnRwb3IiLCJhIjoiY2s2dG11bXhvMDB0eTNycWN0NWR6bGxmMiJ9.rAfZTp56zepoSSpMs0I8X
1.	es
postcode,address,locality,neighborhood,place
2.	language
en
3.	limit
8
4.	autocomplete
false
5.	proximity
-74.70850,40.78375
6.	access_token
pk.eyJ1IjoiZnJvbnRwb3IiLCJhIjoiY2s2dG11bXhvMDB0eTNycWN0NWR6bGxmMiJ9.rAfZTp56zepoSSpMs0I8XQ

