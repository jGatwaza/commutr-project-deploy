// Vercel serverless function entry point
import app from '../src/server.js';

// Wrap the Express app to ensure it handles requests properly
export default async function handler(req, res) {
  // Log for debugging
  console.log(`${req.method} ${req.url}`);
  
  // Let Express handle the request
  return app(req, res);
}
