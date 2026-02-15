# 🚀 Production Deployment Guide

## Frontend Configuration

The frontend now automatically detects production environment and uses the correct API endpoints:
- **Development**: Uses `http://localhost:3001/api` and `ws://localhost:3001`
- **Production**: Uses `https://yourdomain.com/api` and `wss://yourdomain.com`

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

## Deployment Steps

1. **Build the Frontend**:
   ```bash
   npm run build
   ```

2. **Upload Files**:
   - Upload the `dist/` folder contents to your static hosting
   - Upload the `server/` folder to your backend hosting

3. **Set Environment Variables**:
   - Set all the required environment variables on your hosting platform
   - Make sure `NODE_ENV=production` is set

4. **Install Dependencies**:
   ```bash
   cd server
   npm install --production
   ```

5. **Start the Server**:
   ```bash
   npm start
   ```

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