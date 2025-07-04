# 🚀 Werewolf Game Deployment Guide

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- Account on Railway/Vercel/Heroku

## 🛠️ Local Development Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Setup

```bash
# Copy environment file
cp server/.env.example server/.env

# Edit the .env file with your settings
```

### 3. Run Development Servers

```bash
# Terminal 1: Start backend server
npm run server:dev

# Terminal 2: Start frontend
npm run dev
```

The backend will run on `http://localhost:3001` and frontend on `http://localhost:5173`.

## 🌐 Production Deployment

### Option 1: Railway (Recommended)

Railway provides excellent WebSocket support and easy deployment.

#### Backend Deployment:

1. **Create Railway Account**: Go to [railway.app](https://railway.app)

2. **Deploy Backend**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Navigate to server directory
   cd server
   
   # Deploy
   railway up
   ```

3. **Set Environment Variables**:
   - Go to Railway dashboard
   - Select your project
   - Add environment variables:
     ```
     NODE_ENV=production
     PORT=3001
     FRONTEND_URLS=https://your-frontend-domain.vercel.app
     ```

4. **Get Backend URL**: Copy the generated Railway URL (e.g., `https://werewolf-server-production.railway.app`)

#### Frontend Deployment:

1. **Update Socket URL**: Edit `src/services/socketService.ts`:
   ```typescript
   const url = serverUrl || 
     (process.env.NODE_ENV === 'production' 
       ? 'https://your-backend-url.railway.app'  // Your Railway URL
       : 'http://localhost:3001');
   ```

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy frontend
   vercel --prod
   ```

### Option 2: Heroku

#### Backend:
```bash
# Create Heroku app
heroku create werewolf-server-your-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URLS=https://your-frontend-domain.vercel.app

# Deploy
git subtree push --prefix server heroku main
```

#### Frontend:
Deploy to Vercel as shown above.

### Option 3: DigitalOcean/AWS

For advanced users who want full control:

1. **Create VPS/EC2 instance**
2. **Install Node.js and PM2**
3. **Clone repository**
4. **Setup reverse proxy with Nginx**
5. **Configure SSL with Let's Encrypt**

## 🔧 Environment Variables

### Backend (.env):
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URLS=https://your-frontend-domain.com,https://another-domain.com
```

### Frontend:
Update the socket service URL in production.

## 📊 Monitoring & Scaling

### Health Checks
- Backend health endpoint: `/health`
- Stats endpoint: `/stats`

### Scaling Considerations
- Use Redis for session storage in multi-instance deployments
- Implement database for persistent game data
- Add rate limiting for API endpoints

## 🔒 Security Checklist

- ✅ CORS properly configured
- ✅ Helmet.js for security headers
- ✅ Input validation
- ✅ Rate limiting (add in production)
- ✅ Environment variables for secrets
- ✅ HTTPS in production

## 🐛 Troubleshooting

### Common Issues:

1. **WebSocket Connection Failed**:
   - Check CORS configuration
   - Verify server URL in frontend
   - Ensure WebSocket support on hosting platform

2. **Players Can't Join Rooms**:
   - Check network connectivity
   - Verify room codes are being generated correctly
   - Check server logs for errors

3. **Game State Not Syncing**:
   - Verify WebSocket events are being emitted
   - Check for JavaScript errors in browser console
   - Ensure proper error handling

### Debug Commands:
```bash
# Check server logs
railway logs  # For Railway
heroku logs --tail  # For Heroku

# Test WebSocket connection
curl -I https://your-backend-url.railway.app/health
```

## 📈 Performance Optimization

1. **Enable Compression**: Already included in server setup
2. **Use CDN**: For static assets
3. **Database Indexing**: When adding persistent storage
4. **Caching**: Implement Redis for frequently accessed data

## 🔄 CI/CD Pipeline

### GitHub Actions Example:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Test with multiple browsers/devices
4. Verify network connectivity

## 🎯 Next Steps

After successful deployment:
1. Test multiplayer functionality across different devices
2. Monitor server performance and logs
3. Implement additional features (spectator mode, game history, etc.)
4. Add analytics and user feedback collection

Your Werewolf game is now ready for production! 🎮