# Frontend Setup Guide

## Quick Setup

### Step 1: Create `.env` file

Create a `.env` file in the `frontend` directory with the following content:

```env
# Supabase Configuration (REQUIRED)
# Get these from your Supabase project: Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-anon-key-here

# Backend API Configuration
# For local development:
VITE_API_BASE_URL=http://localhost:8000
# For production (replace with your actual backend URL):
# VITE_API_BASE_URL=http://3.239.233.xxx
# VITE_API_BASE_URL=https://your-domain.com

VITE_KDS_API_KEY=your-kds-api-key-here
```

### Step 2: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_KEY`

### Step 3: Get Your KDS API Key

Check your `backend/.env` file for `KDS_API_KEY` and use the same value.

### Step 4: Restart Development Server

After creating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Verify Setup

1. Open `http://localhost:5173/kds`
2. You should see either:
   - **Orders display** (if you have orders)
   - **"No orders found"** message (if no orders yet)
   - **Error message** (if configuration is wrong)

## Troubleshooting

### Blank Screen
- Check browser console (F12) for errors
- Verify `.env` file exists in `frontend` directory
- Make sure all environment variables are set
- Restart the dev server after creating `.env`

### "Configuration Error" Message
- Double-check your Supabase URL and key
- Make sure there are no extra spaces in `.env` file
- Restart the dev server

### "Failed to fetch" Errors
- Check if backend server is running on port 8000
- Verify `VITE_API_BASE_URL` is correct
- Check `VITE_KDS_API_KEY` matches backend `.env`

## Production Deployment

### Step 1: Update `.env` for Production

Update your `frontend/.env` file with production values:

```env
# Supabase Configuration (same as development)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-anon-key-here

# Backend API Configuration (PRODUCTION)
# Replace with your actual production backend URL
VITE_API_BASE_URL=http://3.239.233.xxx
# OR if using HTTPS:
# VITE_API_BASE_URL=https://your-domain.com

# KDS API Key (same as backend .env)
VITE_KDS_API_KEY=your-kds-api-key-here
```

**Important**: 
- Replace `3.239.233.xxx` with your actual backend server IP or domain
- Make sure the backend URL does NOT include `/api` (it's added automatically)
- Example: `http://3.239.233.123` or `https://api.yourdomain.com`

### Step 2: Build for Production

```bash
cd frontend
npm run build
```

This creates a `dist` folder with optimized production files.

### Step 3: Deploy to Server

Copy the `dist` folder contents to your web server (nginx, Apache, etc.):

```bash
# Example: Copy to nginx directory
sudo cp -r dist/* /var/www/frontend/
```

### Step 4: Configure Nginx (if needed)

If using nginx, make sure it's configured to serve the frontend:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 5: Restart Web Server

```bash
sudo systemctl restart nginx
```

## Notes

- Environment variables are embedded at build time (Vite requirement)
- You must rebuild (`npm run build`) after changing `.env` values
- The frontend will automatically use `/api` prefix for all API calls

