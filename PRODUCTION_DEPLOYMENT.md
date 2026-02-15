# 🚀 Production Deployment Guide

## Frontend Configuration

The frontend automatically detects the environment and configures API endpoints:

### Development (localhost)
- **API**: `http://localhost:3001/api`
- **WebSocket**: `ws://localhost:3001`

### Production Options

1. **Automatic Detection** (default):
   - **API**: `https://yourdomain.com/api`
   - **WebSocket**: `wss://yourdomain.com`

2. **Manual Configuration** (recommended):
   Set these variables in `.env` before building:
   ```bash
   VITE_API_URL=https://your-api-server.com/api
   VITE_WS_URL=wss://your-websocket-server.com
   ```

### Common Production Scenarios

#### Same Domain Deployment
If frontend and backend are on the same domain:
```bash
# .env (leave empty for automatic detection)
VITE_API_URL=
VITE_WS_URL=
```

#### Separate Backend Server (Railway, Render, etc.)
```bash
# .env
VITE_API_URL=https://your-backend.railway.app/api
VITE_WS_URL=wss://your-backend.railway.app
```

#### API Subdomain
```bash
# .env
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com
```

## Server Environment Variables

When deploying to production, make sure to set these environment variables:

### Required Variables
```bash
# Database (use your actual Neon database URL)
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Environment
NODE_ENV=production

# Port (use 3001 or whatever your hosting requires)
PORT=3001
```

### Optional Variables
```bash
# CORS Configuration (set to your actual frontend domain)
FRONTEND_URL=https://yourdomain.com

# Session Configuration
SESSION_EXPIRE_HOURS=24
```

## Deployment Options

### Option 1: Separate Frontend/Backend (Recommended)

**Frontend (Vercel/Netlify):**
1. Deploy `dist/` folder to Vercel/Netlify
2. Set environment variables in hosting dashboard

**Backend (Railway/Render):**
1. Deploy `server/` folder to Railway/Render
2. Set all server environment variables
3. Update frontend `.env` with backend URL:
   ```bash
   VITE_API_URL=https://your-backend.railway.app/api
   VITE_WS_URL=wss://your-backend.railway.app
   ```

### Option 2: Vercel Full-Stack (No WebSockets)

⚠️ **Note**: Vercel serverless doesn't support WebSockets. Real-time features won't work.

1. Use the included `vercel.json` configuration
2. Deploy entire project to Vercel
3. Environment variables are auto-detected

### Option 3: Single Server (VPS/Cloud)

Deploy both frontend and backend to same server:
1. Build frontend: `npm run build`
2. Serve `dist/` folder with nginx/apache
3. Run backend on same domain with proxy to `/api/*`

## Common Hosting Platforms

### Static Frontend (Netlify, Vercel, etc.)
- Deploy the `dist/` folder
- No additional configuration needed

### Backend (Railway, Render, Heroku, etc.)
- Deploy the `server/` folder
- Set all environment variables
- Ensure the platform supports WebSocket connections

## Testing Production

1. Visit your frontend URL
2. Try logging in
3. Check browser console for any CORS errors
4. Verify WebSocket connection works for real-time updates

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` environment variable matches your actual frontend domain
- Check that `NODE_ENV=production` is set on the server

### API Connection Errors
- Verify the backend server is running and accessible
- Check that API endpoints are available at `/api/*`

### WebSocket Errors
- Ensure your hosting platform supports WebSocket connections
- Check that WSS (secure WebSocket) is working if using HTTPS