// Vercel serverless function entry point
import express from 'express';

// Create app inline for testing
const testApp = express();
testApp.use(express.json());
testApp.get('/health-test', (req, res) => {
  res.json({ status: 'OK from inline', timestamp: new Date().toISOString() });
});

export default async function handler(req, res) {
  // Test if inline route works
  if (req.url === '/health-test' || req.url.startsWith('/health-test?')) {
    return testApp(req, res);
  }
  
  try {
    // Log for debugging
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Try to import the app
    const { default: app } = await import('../src/server.js');
    
    console.log('App imported successfully');
    
    // Let Express handle the request
    return app(req, res);
  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack 
    });
  }
}
