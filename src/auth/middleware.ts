/**
 * Authentication middleware for Firebase + MongoDB
 * Verifies Firebase ID tokens and auto-creates users in MongoDB
 */

import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from './firebaseAdmin.js';
import { getOrCreateUser } from '../db/services/userService.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        firebaseUid: string;
        email: string;
        displayName?: string;
        photoURL?: string;
        emailVerified: boolean;
      };
    }
  }
}

/**
 * Middleware to verify Firebase authentication and create/update user in MongoDB
 * 
 * Usage:
 *   router.get('/api/endpoint', requireFirebaseAuth, (req, res) => {
 *     const userId = req.user.firebaseUid;
 *     // ... use userId
 *   });
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'No token provided'
      });
      return;
    }

    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    
    // Extract user info from token
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || '';
    const displayName = decodedToken.name;
    const photoURL = decodedToken.picture;
    const emailVerified = decodedToken.email_verified || false;

    // Get or create user in MongoDB
    const user = await getOrCreateUser({
      firebaseUid,
      email,
      ...(displayName && { displayName }),
      ...(photoURL && { photoURL })
    });

    // Attach user info to request
    req.user = {
      firebaseUid,
      email,
      ...(displayName && { displayName }),
      ...(photoURL && { photoURL }),
      emailVerified
    };

    console.log(`✅ Authenticated user: ${email} (${firebaseUid})`);
    
    // Continue to next middleware
    next();
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    res.status(401).json({
      error: 'unauthorized',
      message: error.message || 'Authentication failed'
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for endpoints that can work with or without auth
 */
export async function optionalFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      next();
      return;
    }

    // Verify token and create/update user
    const decodedToken = await verifyIdToken(idToken);
    
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || '';
    const displayName = decodedToken.name;
    const photoURL = decodedToken.picture;
    const emailVerified = decodedToken.email_verified || false;

    await getOrCreateUser({
      firebaseUid,
      email,
      ...(displayName && { displayName }),
      ...(photoURL && { photoURL })
    });

    req.user = {
      firebaseUid,
      email,
      ...(displayName && { displayName }),
      ...(photoURL && { photoURL }),
      emailVerified
    };

    next();
  } catch (error) {
    // Auth failed but it's optional, so continue without user
    console.warn('Optional auth failed:', error);
    next();
  }
}

/**
 * Legacy middleware for backward compatibility
 * Accepts "Bearer TEST" token for testing
 */
export function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  
  // Allow test token for development
  if (auth === 'Bearer TEST') {
    // For test token, use demo user
    req.user = {
      firebaseUid: 'demo-user',
      email: 'demo@commutr.app',
      displayName: 'Demo User'
    };
    next();
    return;
  }
  
  // Otherwise require Firebase auth
  requireFirebaseAuth(req, res, next);
}
