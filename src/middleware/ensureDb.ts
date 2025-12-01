import { Request, Response, NextFunction } from 'express';
import { connectToDatabase, getDatabase } from '../db/connection.js';

let connectionPromise: Promise<any> | null = null;

/**
 * Middleware to ensure database is connected before processing requests
 * This is especially important for serverless environments (Vercel)
 */
export async function ensureDbConnected(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get existing connection
    getDatabase();
    next();
  } catch (error) {
    // Database not connected - connect now
    try {
      // Reuse existing connection attempt if one is in progress
      if (!connectionPromise) {
        connectionPromise = connectToDatabase();
      }
      
      await connectionPromise;
      connectionPromise = null;
      next();
    } catch (dbError) {
      console.error('Failed to connect to database:', dbError);
      res.status(503).json({
        error: 'service_unavailable',
        message: 'Database connection failed. Please try again.'
      });
    }
  }
}
