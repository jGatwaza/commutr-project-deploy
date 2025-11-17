// Vercel serverless function entry point
export default async function handler(req, res) {
  try {
    // Log for debugging
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Try to import the app
    const { default: app } = await import('../src/server.js');
    
    console.log('App imported successfully, type:', typeof app);
    console.log('App keys:', Object.keys(app));
    
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
