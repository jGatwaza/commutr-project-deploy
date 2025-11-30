/**
 * Firebase Admin SDK initialization
 * Used for server-side authentication and user management
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminAuth: Auth;

/**
 * Initialize Firebase Admin SDK
 * Can be initialized with service account credentials or project ID only
 */
export function initializeFirebaseAdmin(): void {
  // Don't initialize if already initialized
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    adminAuth = getAuth(adminApp);
    return;
  }

  try {
    // Try to initialize with service account credentials from environment
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      // Parse service account JSON
      const credentials = JSON.parse(serviceAccount);
      adminApp = initializeApp({
        credential: cert(credentials),
        projectId: 'commutr-1060'
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // Initialize with just project ID (works for token verification)
      adminApp = initializeApp({
        projectId: 'commutr-1060'
      });
      console.log('✅ Firebase Admin initialized with project ID');
      console.log('ℹ️  Note: For full features, set FIREBASE_SERVICE_ACCOUNT env variable');
    }
    
    adminAuth = getAuth(adminApp);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    initializeFirebaseAdmin();
  }
  return adminAuth;
}

/**
 * Verify Firebase ID token
 * Returns the decoded token with user information
 */
export async function verifyIdToken(idToken: string) {
  const auth = getAdminAuth();
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}
