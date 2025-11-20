// Vercel serverless function entry point
export default async function handler(req, res) {
  try {
    console.log(`[Vercel] Request: ${req.method} ${req.url}`);
    
    // Debug endpoint
    if (req.url === '/api/debug-routes' || req.url.startsWith('/api/debug-routes?')) {
      const { default: app } = await import('../src/server.js');
      
      const routes = [];
      if (app._router && app._router.stack) {
        app._router.stack.forEach((layer, i) => {
          if (layer.route) {
            routes.push({
              index: i,
              methods: Object.keys(layer.route.methods),
              path: layer.route.path
            });
          } else if (layer.name === 'router') {
            routes.push({
              index: i,
              type: 'router',
              regexp: layer.regexp.toString()
            });
          } else {
            routes.push({
              index: i,
              type: layer.name || 'unknown'
            });
          }
        });
      }
      
      return res.json({
        status: 'debug',
        appType: typeof app,
        hasRouter: !!app._router,
        routeCount: routes.length,
        routes: routes,
        env: {
          VERCEL: process.env.VERCEL,
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }
    
    // Import the Express app
    const { default: app } = await import('../src/server.js');
    
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
