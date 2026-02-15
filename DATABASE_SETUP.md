# 🗄️ Database Setup Guide

## Step 1: Create Your Neon Database

1. **Visit Neon**: Go to [https://neon.tech](https://neon.tech)
2. **Sign Up**: Create an account (free tier is perfect for this app)
3. **Create Project**:
   - Click "Create Project"
   - **Project Name**: `sacrament-agenda`
   - **Database Name**: `sacrament_agenda_db`
   - **Region**: Choose closest to you
   - Click "Create Project"

4. **Copy Connection String**: You'll get something like:
   ```
   postgresql://username:password@hostname/database?sslmode=require
   ```

## Step 2: Configure Your Server

1. **Update Environment File**:
   - Open `/server/.env`
   - Replace the `DATABASE_URL` line with your actual connection string
   - Example:
   ```bash
   DATABASE_URL=postgresql://myuser:mypass@ep-cool-lab-123456.us-east-1.aws.neon.tech/sacrament_agenda_db?sslmode=require
   ```

2. **Generate JWT Secret**:
   - Replace `your-super-secret-jwt-key-change-this-in-production` with a strong random string
   - You can use: `openssl rand -base64 32` or any password generator

## Step 3: Setup Database Schema

```bash
cd server
npm run setup
```

This will:
- ✅ Connect to your Neon database
- ✅ Create all necessary tables
- ✅ Insert default data (names, smart text)
- ✅ Verify everything is working

## Step 4: Start the Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3001
📀 Connected to PostgreSQL database
📡 WebSocket server ready for real-time updates
```

## Step 5: Test the Connection

Visit: [http://localhost:3001/api/auth/me](http://localhost:3001/api/auth/me)

You should get: `{"error":"Access token required"}` (this is good - it means the server is working!)

## Troubleshooting

### ❌ "ENOTFOUND" Error
- Check your DATABASE_URL is correct
- Verify your Neon database is active
- Check your internet connection

### ❌ "Authentication Failed"
- Your connection string might be wrong
- Try regenerating it in Neon dashboard

### ❌ "SSL Connection Error"
- Make sure your connection string ends with `?sslmode=require`

## Next Steps

Once the server is running successfully, we'll update your React app to use the database instead of localStorage!