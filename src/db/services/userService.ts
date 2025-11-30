import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { User } from '../types.js';

/**
 * Create user record in MongoDB after Firebase authentication
 * Called automatically on first app usage
 * Note: Authentication is handled by Firebase, this only stores preferences
 */
export async function createUser(userData: {
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<User> {
  const db = getDatabase();
  const now = new Date();

  const user: User = {
    _id: new ObjectId(),
    firebaseUid: userData.firebaseUid,
    email: userData.email,
    ...(userData.displayName && { displayName: userData.displayName }),
    ...(userData.photoURL && { photoURL: userData.photoURL }),
    preferences: {
      autoplayEnabled: true,
      notificationsEnabled: true,
      theme: 'light',
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    isActive: true,
  };

  await db.collection<User>('users').insertOne(user);
  console.log(`✅ Created user in MongoDB: ${userData.email}`);
  return user;
}

/**
 * Get user by Firebase UID (primary lookup method)
 */
export async function getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  const db = getDatabase();
  return db.collection<User>('users').findOne({ firebaseUid });
}

/**
 * Get or create user - ensures user exists in MongoDB after Firebase auth
 * This is the main function to call from API endpoints
 */
export async function getOrCreateUser(firebaseUserData: {
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<User> {
  let user = await getUserByFirebaseUid(firebaseUserData.firebaseUid);
  
  if (!user) {
    user = await createUser(firebaseUserData);
  } else {
    // Update last login
    await updateLastLogin(firebaseUserData.firebaseUid);
  }
  
  return user;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  firebaseUid: string,
  preferences: Partial<User['preferences']>
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.collection<User>('users').updateOne(
    { firebaseUid },
    {
      $set: {
        'preferences': preferences,
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount > 0;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(firebaseUid: string): Promise<void> {
  const db = getDatabase();
  await db.collection<User>('users').updateOne(
    { firebaseUid },
    {
      $set: { lastLoginAt: new Date() },
    }
  );
}

/**
 * Get all users (admin function)
 */
export async function getAllUsers(options: {
  limit?: number;
  skip?: number;
} = {}): Promise<User[]> {
  const db = getDatabase();
  const { limit = 50, skip = 0 } = options;

  return db
    .collection<User>('users')
    .find({ isActive: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(firebaseUid: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.collection<User>('users').updateOne(
    { firebaseUid },
    {
      $set: {
        isActive: false,
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount > 0;
}
