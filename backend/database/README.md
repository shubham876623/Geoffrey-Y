# Database Setup Instructions

## Supabase Database Setup

### Step 1: Create Supabase Project
1. Go to https://app.supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Name: `voice-order-system` (or your preferred name)
   - Database Password: Create a strong password (save it securely)
   - Region: Choose closest to your location
5. Click "Create new project"
6. Wait 1-2 minutes for project to initialize

### Step 2: Run Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `schema.sql`
4. Click "Run" (or press Ctrl+Enter)
5. Verify tables are created:
   - Go to **Table Editor**
   - You should see: `restaurants`, `orders`, `order_items`, `order_status_history`

### Step 3: Get API Credentials
1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for frontend)
   - **service_role key** (for backend - keep secret!)

### Step 4: Verify Realtime is Enabled
1. Go to **Database** → **Replication**
2. Verify `orders` table is listed
3. If not, the schema SQL should have enabled it automatically

### Step 5: Test Connection
- Use the credentials in your `.env` file (see backend setup)

## Database Tables Overview

### restaurants
- Stores restaurant information
- Each restaurant has PrintNode API key and printer ID
- Multi-tenant support

### orders
- Main order records
- Links to restaurant via `restaurant_id`
- Tracks status, customer info, totals

### order_items
- Individual items in each order
- Supports bilingual: `item_name` (English) + `item_name_chinese`
- Stores quantity, size, pieces, special instructions

### order_status_history
- Tracks all status changes
- Useful for auditing and analytics

## Notes
- All tables have UUID primary keys
- Foreign key constraints ensure data integrity
- Indexes added for performance on common queries
- RLS (Row Level Security) enabled but permissive for MVP
- Realtime enabled on `orders` table for live updates

