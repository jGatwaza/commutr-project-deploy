# Vercel Serverless API Fix - Critical Changes

## Problem Identified
The API routes were not working on Vercel because:
1. ❌ The serverless function was exporting the Express app directly instead of a handler function
2. ❌ Duplicate route definitions were causing conflicts
3. ❌ The catch-all route was registered too early, blocking API routes
4. ❌ Missing @vercel/node package for TypeScript types

## Critical Fixes Applied

### 1. Fixed `api/index.ts` - Proper Serverless Handler
**BEFORE:**
```typescript
import app from '../src/server.js';
export default app;
```

**AFTER:**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
```

**Why:** Vercel serverless functions require a handler function that accepts `req` and `res` parameters, not a direct Express app export.

### 2. Fixed `src/server.ts` - Route Order and Duplicates
**Removed:**
- Duplicate `app.use('/api/wizard', wizardApiRouter)` 
- Duplicate `app.use(playbackRouter)`
- Duplicate `app.use(agentRouter)`
- Early catch-all route that was blocking API routes

**Fixed:**
- Moved SPA catch-all route to the very end
- Added proper route skipping logic to prevent catch-all from interfering with API routes
- Ensured API routes are registered before any wildcard routes

### 3. Added Missing Dependency
Added `@vercel/node` to `package.json` devDependencies for TypeScript types.

### 4. Improved SPA Fallback Route
```typescript
// SPA fallback route - must be last
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api') || 
      req.path.startsWith('/v1') || 
      req.path.startsWith('/health') || 
      req.path.startsWith('/legacy') || 
      req.path.startsWith('/s/')) {
    return next();
  }

  // Serve appropriate index.html
  if (hasDist) {
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  } else {
    const indexPath = path.join(legacyDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }

  return res.status(404).send('App not found');
});
```

## Current Route Registration Order (CORRECT)
1. ✅ Static files middleware
2. ✅ API routes (`/api/*`)
3. ✅ Web routes (playlist, playback, agent)
4. ✅ Health check (`/health`)
5. ✅ Legacy route (`/legacy`)
6. ✅ Share token redirect (`/s/:token`)
7. ✅ SPA fallback (`*`) - LAST, with API route skipping

## Vercel Configuration
The `vercel.json` is configured to:
- Run `npm install && npm run build`
- Route all `/api/*` and `/v1/*` requests to the serverless function
- Serve static files from `dist/` for everything else
- Use Node.js 20.x runtime for TypeScript compilation

## Testing the Fix

### Before Deploying - Local Test
```bash
npm install
npm run dev
```

Visit:
- ✅ http://localhost:3000 - React app
- ✅ http://localhost:5173/health - Health check
- ✅ http://localhost:5173/api/wizard/recommendations - API route

### After Deploying - Vercel Test
```bash
# Deploy
git add .
git commit -m "Fix serverless API handler"
git push
```

Visit your Vercel URL:
- ✅ https://your-app.vercel.app - React app
- ✅ https://your-app.vercel.app/health - Health check
- ✅ https://your-app.vercel.app/api/* - API routes
- ✅ Agent Mode - AI agent functionality
- ✅ Playlist creation - Video playlists

## Environment Variables Required
Don't forget to set in Vercel Dashboard:
- `GROQ_API_KEY` - For AI agent
- `YOUTUBE_API_KEY` - For video content

## How Serverless Works Now

### Request Flow:
```
User Request → Vercel Edge
     ↓
Is it /api/* or /v1/* ?
     ↓ YES
Serverless Function (api/index.ts)
     ↓
Handler function calls Express app
     ↓
Express routes handle the request
     ↓
Response sent back
     
     ↓ NO (other paths)
Static files from dist/
```

### Express App Behavior:
- **On Vercel**: Express app is invoked by the handler function for each request (stateless)
- **Locally**: Express app runs as a persistent server on port 5173
- **Detection**: Checks `process.env.VERCEL === '1'` to determine environment

## Next Steps
1. ✅ Run `npm install` (already done)
2. ✅ Test locally with `npm run dev`
3. ✅ Commit and push changes
4. ✅ Deploy to Vercel
5. ✅ Add environment variables in Vercel
6. ✅ Test all API endpoints
7. 🎉 Your API should work!

## Debugging
If issues persist, check Vercel Function Logs:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by "Functions"
5. Look for errors in the `/api` function

Common issues:
- Missing environment variables → 500 error
- Import errors → Function won't build
- Route conflicts → 404 error
- CORS issues → Check CORS middleware
