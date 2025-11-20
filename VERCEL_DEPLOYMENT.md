# Vercel Deployment Guide for Commutr

This guide will help you deploy the Commutr application to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. The Vercel CLI installed (optional, but recommended): `npm i -g vercel`

## Environment Variables

Before deploying, you need to set up the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **GROQ_API_KEY**
   - Get your free API key from https://console.groq.com
   - Used for AI agent functionality (Commutr Assistant)
   
2. **YOUTUBE_API_KEY**
   - Get your API key from https://console.cloud.google.com/apis/credentials
   - Enable YouTube Data API v3 in your Google Cloud project
   - Used for fetching video content and metadata

### Optional Environment Variables

3. **PORT** (default: 3000)
   - The port for the server (auto-configured by Vercel)

4. **VERCEL** (auto-set by Vercel to "1")
   - Automatically set by Vercel to indicate serverless environment

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Connect Your Repository**
   - Go to https://vercel.com/new
   - Import your GitHub/GitLab/Bitbucket repository
   - Vercel will auto-detect the project settings

2. **Configure Environment Variables**
   - In the project settings, go to "Environment Variables"
   - Add `GROQ_API_KEY` and `YOUTUBE_API_KEY`
   - Make sure to add them for Production, Preview, and Development environments

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add GROQ_API_KEY
   # Enter your Groq API key when prompted
   
   vercel env add YOUTUBE_API_KEY
   # Enter your YouTube API key when prompted
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

## How It Works

### Architecture

The deployment configuration uses:
- **Vite** to build the React frontend into the `dist` folder
- **Vercel Serverless Functions** to run the Express API backend
- **Rewrites** to route API requests to the serverless function

### File Structure

```
commutr-project/
├── api/
│   └── index.ts           # Serverless function entry point (TypeScript)
├── dist/                  # Built React app (created during build)
├── src/
│   └── server.ts          # Express server (adapted for serverless)
├── client/                # React frontend source
├── vercel.json            # Vercel configuration
└── package.json           # Build scripts
```

### Important Notes

- The `api/index.ts` file is a TypeScript serverless function that Vercel automatically compiles
- All dependencies are automatically installed by Vercel during build
- The server checks `process.env.VERCEL === '1'` to avoid starting a server in serverless mode
- TypeScript files in `src/` are imported directly; Vercel handles compilation

### API Routes

All API routes are handled by the serverless function at `/api`:
- `/api/*` - API endpoints
- `/v1/*` - API v1 endpoints
- `/health` - Health check
- `/s/:token` - Share links
- `/legacy` - Legacy site

All other routes serve the React SPA from `dist/index.html`.

## Verifying Deployment

After deployment:

1. **Check the frontend**: Visit your Vercel URL (e.g., `https://commutr.vercel.app`)
2. **Test API health**: Visit `https://your-app.vercel.app/health`
3. **Test Agent Mode**: Navigate to the Agent Mode page and try creating a playlist
4. **Check logs**: Go to Vercel Dashboard → Your Project → Logs to see runtime logs

## Troubleshooting

### Build Fails

- **Error**: "Cannot find module"
  - Solution: Make sure runtime dependencies (express, cors, groq-sdk, etc.) are in `dependencies`, not `devDependencies`
  - Solution: Build dependencies (tsx, typescript, vite, etc.) can be in `devDependencies`
  - Solution: Run `npm install` locally to verify all packages are installed
  - Solution: Check that `api/index.ts` exists and exports the Express app

### API Routes Not Working

- **Error**: 404 on `/api/*` routes
  - Solution: Check `vercel.json` rewrites are correctly configured
  - Solution: Verify `api/index.ts` exists and exports the Express app
  - Solution: Check Vercel function logs for errors

### Environment Variables Not Working

- **Error**: "API key not found" or similar
  - Solution: Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  - Solution: Make sure variables are set for the correct environment (Production/Preview/Development)
  - Solution: Redeploy after adding environment variables

### Agent Mode Not Working

- **Error**: "Groq API error"
  - Solution: Verify `GROQ_API_KEY` is set correctly in Vercel
  - Solution: Check Groq API key is valid at https://console.groq.com

### Videos Not Loading

- **Error**: "No videos found" or YouTube API errors
  - Solution: Verify `YOUTUBE_API_KEY` is set correctly in Vercel
  - Solution: Ensure YouTube Data API v3 is enabled in Google Cloud Console
  - Solution: Check API quota limits haven't been exceeded

## Local Development vs Production

### Local Development (`npm run dev`)
- Frontend runs on port 3000 (Vite dev server)
- Backend runs on port 5173 (Express server)
- Vite proxies API requests to port 5173

### Production (Vercel)
- Frontend is served as static files from `dist/`
- Backend runs as a serverless function at `/api`
- All requests are handled by the same deployment URL

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to your main/master branch
- **Preview**: Pull requests and other branches

You can configure this in Vercel Dashboard → Your Project → Settings → Git.

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Commutr Issues: Create an issue in the repository
- Check the logs in Vercel Dashboard for detailed error messages
