# Voice Order System - Frontend

Professional Kitchen Display System (KDS) and Front Desk display for restaurant order management.

## Features

- **Kitchen Display System (KDS)**: Interactive order management with status update buttons
- **Front Desk Display**: Read-only order display for front desk staff
- **Real-time Updates**: Automatic updates via Supabase Realtime
- **Bilingual Support**: English + Chinese translations for all order items
- **Professional Design**: Modern, clean, and beautiful UI inspired by professional KDS systems
- **Responsive**: Works on tablets, desktops, and mobile devices
- **Kiosk Mode**: Full-screen display optimized for kitchen and front desk use

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_KEY=your_supabase_anon_key_here

# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_KDS_API_KEY=your_kds_api_key_here
```

**Get these values from:**
- **Supabase URL & Key**: From your Supabase project settings
- **API Base URL**: Your backend server URL (default: `http://localhost:8000`)
- **KDS API Key**: From your backend `.env` file (`KDS_API_KEY`)

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Access the Displays

- **KDS (Kitchen)**: `http://localhost:5173/kds`
- **Front Desk**: `http://localhost:5173/front-desk`

## Routes

- `/kds` - Kitchen Display System (interactive, with status buttons)
- `/front-desk` - Front Desk Display (read-only)

## Features

### Kitchen Display System (KDS)

- View all active orders in real-time
- Filter by status (All, Pending, Preparing, Ready)
- Update order status with one click:
  - **Start Preparing** (Pending → Preparing)
  - **Ready for Pickup** (Preparing → Ready)
  - **Mark Completed** (Ready → Completed)
- See elapsed time for each order
- Bilingual item display (English + Chinese)
- Color-coded status indicators

### Front Desk Display

- View all orders (including completed)
- Filter by status
- Real-time status updates
- Read-only view (no status buttons)
- Professional display for customer-facing areas

## Technology Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Supabase JS** - Real-time database
- **React Router** - Routing
- **React Icons** - Icons
- **Axios** - HTTP client

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

The frontend can be deployed to:
- AWS EC2 (static files served via Nginx)
- Vercel
- Netlify
- Any static hosting service

Make sure to update the environment variables in your deployment platform.
