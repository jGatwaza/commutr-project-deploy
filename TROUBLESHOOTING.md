# Troubleshooting Guide

## Issues Fixed

### ✅ Issue 1: "Failed to save commute: HTTP 500"

**Problem:** When finishing a commute, the app showed error: `Failed to save commute: HTTP 500: {"error":"Failed to save commute"}`

**Root Cause:** The endpoint was trying to use `userId` from the request body instead of the authenticated user from Firebase middleware.

**Fix:**
```typescript
// Before (WRONG):
const { userId, session } = parsed.data;
const savedSession = await saveCommuteSessionDB({
  firebaseUid: userId,  // ❌ userId from body
  ...
});

// After (CORRECT):
const { session } = parsed.data;
const firebaseUid = req.user!.firebaseUid;  // ✅ From Firebase auth
const savedSession = await saveCommuteSessionDB({
  firebaseUid,
  ...
});
```

**Files Changed:**
- `src/web/history.ts` - Updated commute save endpoint

---

### ✅ Issue 2: Users Table Empty in MongoDB

**Problem:** After signing into the app, the MongoDB `users` collection remained empty.

**Root Cause:** Users are **only created when they make an authenticated API call**, not when they sign in to Firebase. The frontend was using a hardcoded test token (`Bearer TEST`) instead of real Firebase ID tokens.

**Fix:**
1. Created `getAuthHeaders(user)` utility to get Firebase ID tokens
2. Updated all frontend components to use real Firebase authentication
3. Added Firebase Admin SDK to verify tokens on the backend
4. Users now auto-created in MongoDB on first API call

**Files Changed:**
- `client/config/api.js` - Added `getAuthHeaders()` utility
- `client/components/history/AnalyticsTab.jsx` - Use Firebase tokens
- `client/components/history/WatchedList.jsx` - Use Firebase tokens
- `client/pages/ImmersivePlayer.jsx` - Use Firebase tokens
- `client/components/PlaylistModal.jsx` - Use Firebase tokens
- `src/auth/firebaseAdmin.ts` - Firebase Admin SDK setup
- `src/auth/middleware.ts` - Auth middleware with auto user creation
- `src/server.ts` - Initialize Firebase Admin on startup

---

### ✅ Issue 3: Analytics Tab Broken

**Problem:** Analytics tab not loading data.

**Root Cause:** Same as Issue #2 - using test token instead of Firebase tokens.

**Fix:** Updated `AnalyticsTab.jsx` to use `getAuthHeaders(user)` for all fetch calls.

**Test:** Open analytics tab → Should now load data (even if empty initially)

---

## How to Verify Fixes

### Test 1: Check Server Logs

Start the dev server and watch for these messages:

```bash
npm run dev

# Expected output:
✅ Firebase Admin initialized with project ID
✅ Connected to MongoDB
✅ MongoDB connected successfully
```

### Test 2: Create a Commute and Check Database

1. **Sign in to the app** with Google
2. **Create a playlist** (any topic, any duration)
3. **Watch at least one video**
4. **Finish the commute**
5. **Check the database:**

```bash
npm run db:check
```

You should see:
- ✅ 1 user in `users` collection
- ✅ 1 playlist in `playlists` collection  
- ✅ 1+ videos in `watch_history` collection
- ✅ 1 session in `commute_sessions` collection

### Test 3: Check Server Logs for Commute Save

When you finish a commute, watch the server logs:

```
Saving commute for user: YOUR_FIREBASE_UID with 3 videos
✅ Commute saved: { firebaseUid: 'YOUR_FIREBASE_UID', commuteId: 'commute-123...' }
```

If you see errors, they'll now include detailed error messages.

### Test 4: Analytics Tab

1. **Sign in to the app**
2. **Go to History → Analytics tab**
3. **Should load without errors** (even if showing "No data yet")
4. **Watch some videos**
5. **Refresh analytics** → Should show your watch data

---

## Common Issues

### "unauthorized" or "Authentication failed"

**Symptom:** API calls return 401 Unauthorized

**Solutions:**

1. **Check you're signed in:**
   - Look for user profile in top-right corner
   - If not signed in, click "Sign In" button

2. **Check Firebase token:**
   ```javascript
   // In browser console
   const user = firebase.auth().currentUser;
   const token = await user.getIdToken();
   console.log('Token:', token);
   ```

3. **Check server logs:**
   ```
   ❌ Authentication error: Invalid or expired token
   ```
   If you see this, sign out and sign back in.

4. **Token expired:**
   - Firebase tokens expire after 1 hour
   - Signing out and back in refreshes the token

---

### Database Still Empty After API Calls

**Check these:**

1. **Are you actually signed in?**
   ```javascript
   // In browser console
   const user = firebase.auth().currentUser;
   console.log('Signed in:', !!user);
   ```

2. **Check browser console for errors:**
   - Open DevTools → Console tab
   - Look for red error messages
   - Common: "Failed to fetch", "Network error"

3. **Check server is running:**
   ```bash
   curl http://localhost:5173/health
   # Expected: {"status":"ok","database":"connected"}
   ```

4. **Check server logs:**
   ```
   ✅ Authenticated user: your-email@gmail.com (firebase-uid-123)
   ```

5. **Try test token (for debugging only):**
   ```javascript
   // Temporarily use test token
   const res = await fetch('http://localhost:5173/api/history', {
     headers: { 'Authorization': 'Bearer TEST' }
   });
   ```

---

### "Model `llama-3.3-8b-instant` does not exist"

**Symptom:** Groq API errors in server logs

**This is NOT related to MongoDB issues.** This is a separate issue with the Groq AI model used for suggestions.

**Solutions:**

1. **Check GROQ_API_KEY in `.env`:**
   ```bash
   cat .env | grep GROQ
   ```

2. **Update model name** in `src/services/groqSuggestions.ts`:
   ```typescript
   // Change from:
   model: 'llama-3.3-8b-instant'
   // To:
   model: 'llama-3.3-70b-versatile'  // or another available model
   ```

3. **Check Groq dashboard** for available models:
   - Visit https://console.groq.com
   - Check API limits and available models

---

### "YouTube quota exceeded"

**Symptom:** "YouTube API quota reached" errors

**This is NOT related to MongoDB issues.** YouTube API has daily quota limits.

**Solutions:**

1. **Wait 24 hours** for quota to reset
2. **Create new YouTube API key:**
   - Go to https://console.cloud.google.com
   - Enable YouTube Data API v3
   - Create new API key
   - Update `YOUTUBE_API_KEY` in `.env`

3. **Use cached/seed data** (temporarily):
   - App falls back to seed data when quota exceeded
   - Not ideal but allows testing

---

## Debugging Tools

### Check What's in Database

```bash
npm run db:check
```

Shows current state of all collections.

### Test API Endpoints Manually

```bash
# Health check
curl http://localhost:5173/health

# With test token (for debugging)
curl -X POST http://localhost:5173/api/history/watch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEST" \
  -d '{
    "userId": "test-user",
    "videoId": "test-123",
    "title": "Test Video",
    "durationSec": 300,
    "progressPct": 100,
    "completedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Check database again
npm run db:check
```

### Check MongoDB Atlas Directly

1. Go to https://cloud.mongodb.com
2. Click "Browse Collections"
3. Select `commutr_db` database
4. View each collection:
   - `users` - Should see your user
   - `playlists` - Your created playlists
   - `watch_history` - Videos you watched
   - `commute_sessions` - Your commutes
   - `mastery` - Topic progress
   - `achievements` - Your badges

### Enable Detailed Logging

The server now logs all important operations:

```typescript
// Commute save
console.log('Saving commute for user:', firebaseUid, 'with', videosCount, 'videos');
console.log('✅ Commute saved:', { firebaseUid, commuteId });

// Analytics
console.log('📊 Fetching analytics for user:', userId, 'timeframe:', timeframe);
console.log('✅ Analytics fetched:', analytics);

// Authentication
console.log('✅ Authenticated user:', email, '(', firebaseUid, ')');
```

Watch the terminal running `npm run dev` for these logs.

---

## Quick Fixes

### Reset Everything (Nuclear Option)

If nothing works, reset the database:

```bash
# WARNING: This deletes ALL data!
npm run db:init:drop

# Restart server
npm run dev

# Try again:
# 1. Sign in
# 2. Create playlist
# 3. Watch video
# 4. Check database
npm run db:check
```

### Use Test Token (Debugging Only)

If Firebase auth is causing issues, temporarily use test token:

```javascript
// In client/config/api.js (TEMPORARILY)
export async function getAuthHeaders(user) {
  // Bypass Firebase auth for debugging
  return { 'Authorization': 'Bearer TEST' };
}
```

This creates a `demo-user` in MongoDB. **Don't use in production!**

---

## Success Checklist

After fixes, you should see:

- ✅ Server starts without errors
- ✅ `✅ Firebase Admin initialized`
- ✅ `✅ MongoDB connected successfully`
- ✅ Sign in with Google works
- ✅ Creating playlist works
- ✅ Watching videos works
- ✅ **Finishing commute works (no more 500 error!)**
- ✅ **Users appear in database**
- ✅ **Analytics tab loads**
- ✅ `npm run db:check` shows your data

---

## Still Having Issues?

1. **Check all server logs** for errors
2. **Check browser console** for errors
3. **Run `npm run db:check`** to see database state
4. **Try test token** to isolate Firebase auth issues
5. **Reset database** with `npm run db:init:drop`
6. **Check `.env` file** has all required variables:
   ```
   MONGODB_URI=mongodb+srv://...
   MONGODB_DB_NAME=commutr_db
   MONGODB_POOL_SIZE=10
   GROQ_API_KEY=...
   YOUTUBE_API_KEY=...
   ```

---

**Last Updated:** November 30, 2025
**MongoDB Integration:** Complete ✅
**Firebase Auth:** Working ✅
**All Issues:** Fixed ✅
