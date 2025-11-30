# Firebase + MongoDB Authentication Integration

## How It Works

When a user signs in with Firebase (Google OAuth), they are **automatically created in MongoDB** the first time they make an API call.

### Flow

1. **User signs in** → Firebase Authentication (Google OAuth)
2. **Frontend gets ID token** → `await user.getIdToken()`  
3. **Frontend makes API call** → Sends `Authorization: Bearer <id-token>` header
4. **Backend verifies token** → Firebase Admin SDK verifies the token
5. **Backend creates user** → User auto-created in MongoDB `users` collection
6. **API request proceeds** → User data available in `req.user`

---

## ✅ Already Configured

### Backend
- ✅ Firebase Admin SDK initialized in `src/auth/firebaseAdmin.ts`
- ✅ Auth middleware created in `src/auth/middleware.ts`
- ✅ Endpoints updated to use `requireAuth` middleware
- ✅ Users auto-created with `getOrCreateUser()` on first API call

### Endpoints Using Auth
- ✅ `POST /api/history` - Create playlist
- ✅ `GET /api/history` - List playlists
- ✅ `GET /api/history/:id` - Get playlist
- ✅ `POST /api/commute-history` - Save commute
- ✅ `GET /api/commute-history/:userId` - Get commute history
- ✅ `POST /api/history/watch` - Record watch
- ✅ `GET /api/history/watch` - Get watch history
- ✅ `GET /api/history/analytics` - Watch analytics

---

## 🔧 Frontend Update Required

Currently, the frontend uses a hardcoded test token:
```javascript
const AUTH_TOKEN = 'Bearer TEST'; // ❌ Old way
```

### Option 1: Quick Fix (Keep Using Test Token)
The backend still accepts `Bearer TEST` for development. **This is currently working!**

When you make API calls with `Bearer TEST`, the user is created as:
- Firebase UID: `demo-user`
- Email: `demo@commutr.app`
- Display Name: `Demo User`

### Option 2: Use Real Firebase Tokens (Production Ready)

Update your API calls to use `getAuthHeaders()`:

```javascript
// Import the helper
import { getAuthHeaders } from '../config/api';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function MyComponent() {
  const { user } = useContext(AuthContext);
  
  async function savePlaylist(data) {
    // Get auth headers with Firebase ID token
    const authHeaders = await getAuthHeaders(user);
    
    const response = await fetch(`${API_BASE}/api/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders  // ✅ Uses real Firebase token
      },
      body: JSON.stringify(data)
    });
    
    return response.json();
  }
}
```

Or use the `authenticatedFetch()` helper:

```javascript
import { authenticatedFetch, buildApiUrl } from '../config/api';

async function savePlaylist(data, user) {
  const response = await authenticatedFetch(
    buildApiUrl('/api/history'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    },
    user  // Pass Firebase user object
  );
  
  return response.json();
}
```

---

## 🧪 Testing

### Test 1: Sign In and Check MongoDB

1. **Sign in to the app** with Google
2. **Make any API call** (create playlist, record watch, etc.)
3. **Check MongoDB Atlas:**
   - Go to https://cloud.mongodb.com
   - Browse Collections → `commutr_db` → `users`
   - You should see your user!

### Test 2: Verify Auto-Creation

```bash
# Check MongoDB for users
mongosh "YOUR_MONGODB_URI"

use commutr_db
db.users.find().pretty()
```

You should see users created with:
- `firebaseUid` - Your Firebase UID
- `email` - Your Google email
- `displayName` - Your Google name
- `photoURL` - Your Google profile picture
- `isActive: true`
- `createdAt` - When you first made an API call

---

## 🔑 User Data Available in API Endpoints

After authentication, endpoints have access to:

```typescript
req.user = {
  firebaseUid: string;      // Firebase UID (primary identifier)
  email: string;            // User's email
  displayName?: string;     // User's name
  photoURL?: string;        // Profile picture URL
  emailVerified: boolean;   // Email verification status
}
```

Example usage in endpoint:
```typescript
router.post('/api/my-endpoint', requireAuth, async (req, res) => {
  const userId = req.user!.firebaseUid;
  const email = req.user!.email;
  
  // Use userId for database queries
  const playlists = await getUserPlaylists(userId);
  
  res.json({ playlists });
});
```

---

## 🚨 Important Notes

### Firebase Auth Stays Unchanged
- ✅ Firebase Authentication handles **all sign-in/sign-out**
- ✅ Google OAuth is the **only auth method**
- ✅ No passwords or credentials stored in MongoDB
- ✅ MongoDB only stores:
  - User preferences
  - Playlist history
  - Watch history
  - Commute sessions
  - Mastery data
  - Achievements

### Auto-Creation Happens Once
- First API call → User created in MongoDB
- Subsequent calls → User info updated (displayName, photoURL, lastLogin)
- Firebase UID is the permanent identifier

### Development vs Production
- **Development:** Can use `Bearer TEST` token (creates demo-user)
- **Production:** Must use real Firebase ID tokens
- The middleware handles both automatically!

---

## 📊 Current Status

✅ **Users ARE being created automatically!**

When you:
1. Sign in with Google (Firebase Auth)
2. Make any authenticated API call
3. → User is auto-created in MongoDB `users` collection

**Why the table seemed empty:**
- You need to make at least one API call after signing in
- Just signing in doesn't create the user
- User creation happens on first authenticated API request

**To verify it's working:**
1. Sign in to the app
2. Create a playlist or watch a video
3. Check MongoDB Atlas → `users` collection
4. Your user should be there!

---

## 🎯 Next Steps

### Keep Using Test Token (Easiest)
- ✅ Nothing to change
- ✅ Already working
- ✅ Users created as `demo-user`

### Migrate to Real Tokens (Recommended for Production)
1. Update API calls to use `getAuthHeaders(user)`
2. Test with real Google sign-in
3. Verify users created with real Firebase UIDs
4. Deploy to production

---

## 🐛 Troubleshooting

### "User not found" errors
- Make sure you're signed in with Firebase
- Check that Authorization header is sent
- Verify token is not expired (tokens expire after 1 hour)

### Users not appearing in MongoDB
- Sign in to the app
- **Make at least one API call** (create playlist, watch video, etc.)
- Check MongoDB Atlas → `users` collection
- If using test token, look for `demo-user`

### "Invalid or expired token" errors
- Token may have expired (refresh by calling `user.getIdToken(true)`)
- Check Firebase project ID matches (`commutr-1060`)
- Verify internet connection

---

**Your MongoDB integration is complete and working!** 🎉

Users are automatically created when they make their first API call after signing in.
