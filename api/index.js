// Vercel serverless function entry point
export default async function handler(req, res) {
  try {
    console.log(`[Vercel] Request: ${req.method} ${req.url}`);
    
    // Import the Express app
    const { default: app } = await import('../src/server.js');
    
    console.log(`[Vercel] App imported, type: ${typeof app}`);
    console.log(`[Vercel] App._router:`, app._router ? 'exists' : 'missing');
    
    if (app._router && app._router.stack) {
      console.log(`[Vercel] Routes registered: ${app._router.stack.length}`);
      app._router.stack.forEach((layer, i) => {
        if (layer.route) {
          console.log(`[Vercel]   ${i}: ${Object.keys(layer.route.methods)} ${layer.route.path}`);
        } else if (layer.name === 'router') {
          console.log(`[Vercel]   ${i}: router at ${layer.regexp}`);
        }
      });
    }
    
    // Let Express handle the request
    return app(req, res);
  } catch (error) {
    console.error('[Vercel] Error in handler:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack 
    });
  }
}
