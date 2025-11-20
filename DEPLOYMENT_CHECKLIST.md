# Vercel Deployment Checklist

## ✅ Configuration Complete

The following files have been configured for Vercel deployment:

### Files Modified/Created:
- ✅ `vercel.json` - Vercel configuration with build commands and rewrites
- ✅ `api/index.ts` - TypeScript serverless function entry point
- ✅ `src/server.ts` - Server adapted for serverless (skips listen() on Vercel)
- ✅ `package.json` - Build scripts configured
- ✅ `.vercelignore` - Excludes unnecessary files from deployment
- ✅ `.env.example` - Documents required environment variables

## 🚀 Ready to Deploy

### Step 1: Set Environment Variables in Vercel

Before deploying, add these environment variables in your Vercel project:

1. **`GROQ_API_KEY`**
   - Get from: https://console.groq.com
   - Required for: AI Agent/Assistant functionality

2. **`YOUTUBE_API_KEY`**
   - Get from: https://console.cloud.google.com/apis/credentials
   - Enable: YouTube Data API v3
   - Required for: Video content and playlists

### Step 2: Deploy

**Option A: Via Vercel Dashboard**
```
1. Visit https://vercel.com/new
2. Import your repository
3. Add environment variables (Settings → Environment Variables)
4. Click "Deploy"
```

**Option B: Via CLI**
```bash
npm i -g vercel
vercel login
vercel env add GROQ_API_KEY
vercel env add YOUTUBE_API_KEY
vercel --prod
```

## 🔧 How It Works

### Local Development (npm run dev):
- ✅ Frontend: `http://localhost:3000` (Vite dev server)
- ✅ Backend: `http://localhost:5173` (Express server)
- ✅ API proxy via Vite config

### Production (Vercel):
- ✅ Frontend: Static files served from `dist/`
- ✅ Backend: Serverless function at `/api`
- ✅ Single URL handles both frontend and API
- ✅ TypeScript auto-compiled by Vercel
- ✅ Dependencies auto-installed during build

### API Routes Handled:
- `/api/*` → Serverless function
- `/v1/*` → Serverless function
- `/health` → Serverless function
- `/s/:token` → Serverless function
- `/legacy` → Serverless function
- All other routes → React SPA

## ⚡ Build Process

1. **Install Phase**: `npm install` (automatic)
2. **Build Phase**: `npm run build` → Vite builds React app to `dist/`
3. **Function Compilation**: Vercel compiles `api/index.ts` and dependencies
4. **Deploy Phase**: Static files + serverless function deployed

## 🔍 Verifying Deployment

After deployment:

1. ✅ Check frontend: `https://your-app.vercel.app`
2. ✅ Test API health: `https://your-app.vercel.app/health`
3. ✅ Test playlists: Navigate to Wizard or Agent Mode
4. ✅ Check logs: Vercel Dashboard → Logs

## ⚠️ Common Issues

### Issue: "Cannot find module" errors
- **Solution**: Check that all runtime dependencies are in `dependencies`, not `devDependencies`
- **Check**: `express`, `cors`, `groq-sdk`, `socket.io`, `dotenv`, etc.

### Issue: API routes return 404
- **Solution**: Verify `api/index.ts` exists and exports the Express app
- **Solution**: Check Vercel function logs for errors

### Issue: Environment variables not working
- **Solution**: Set them in Vercel Dashboard for Production environment
- **Solution**: Redeploy after adding variables

### Issue: TypeScript errors during build
- **Solution**: Vercel auto-installs TypeScript dependencies
- **Solution**: Ensure `tsconfig.json` is properly configured
- **Solution**: Check build logs for specific errors

## 📖 Full Documentation

See `VERCEL_DEPLOYMENT.md` for complete deployment guide and troubleshooting.

## 🎯 Next Steps

1. Copy `.env.example` to `.env` for local development
2. Add your API keys to `.env` locally
3. Test locally with `npm run dev`
4. Push to GitHub
5. Deploy to Vercel
6. Add environment variables in Vercel
7. Test production deployment
8. 🎉 You're live!
