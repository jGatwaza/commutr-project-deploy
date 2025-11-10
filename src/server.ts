import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import playlistRouter from './web/playlist.js';
import streakRouter from './web/streak.js';
import playbackRouter from './web/playback.js';
import agentRouter from './web/agent.js';
import historyRouter from './web/history.js';
import recommendRouter from './web/recommend.js';
import achievementsRouter from './web/achievements.js';
import wizardApiRouter from './api/wizard.js';
import watchHistoryRouter from './web/watchHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const distDir = path.join(__dirname, '../dist');
const legacyDir = path.join(__dirname, '../public');
const hasDist = fs.existsSync(distDir);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
if (hasDist) {
  app.use(express.static(distDir));
} else {
  app.use(express.static(legacyDir));
}

// API Routes
app.use('/api', wizardApiRouter); // Wizard API routes
app.use('/api', streakRouter);
app.use('/api', historyRouter);
app.use('/api', watchHistoryRouter);
app.use('/api', recommendRouter);
app.use('/api', achievementsRouter);

// Web Routes
app.use(playlistRouter);
app.use(playbackRouter);
app.use(agentRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for SPA routing
app.get('*', (req, res) => {
  if (hasDist) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    res.sendFile(path.join(legacyDir, 'index.html'));
  }
});
app.use('/api/wizard', wizardApiRouter);
app.use(playbackRouter);
app.use(agentRouter);

app.get('/legacy', (_req, res) => {
  const legacyIndex = path.join(legacyDir, 'index.html');
  if (fs.existsSync(legacyIndex)) {
    return res.sendFile(legacyIndex);
  }
  return res.status(404).send('Legacy site not found');
});

// Redirect /s/:token to share.html with token query param
app.get('/s/:token', (req, res) => {
  const target = hasDist
    ? `/legacy/share.html?t=${req.params.token}`
    : `/share.html?t=${req.params.token}`;
  res.redirect(target);
});

if (hasDist) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/v1') || req.path.startsWith('/legacy')) {
      return next();
    }

    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }

    return res.status(404).send('App build not found');
  });
}

const PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 5173;

// Start the server
server.listen(API_PORT, () => {
  console.log(`🚀 API Server running on port ${API_PORT}`);
  console.log(`🌍 Web Server running on port ${PORT}`);
  console.log(`📂 Serving from: ${hasDist ? 'dist' : 'public'} directory`);
  
  // Log all registered routes
  console.log('\n📡 Registered Routes:');
  console.log('  GET    /health');
  console.log('  POST   /api/wizard/recommendations');
  console.log('  POST   /api/wizard/playlist');
  console.log('  GET    /api/streak');
  console.log('  GET    /api/history');
  console.log('  GET    /api/recommend');
  console.log('  GET    /api/achievements');
  console.log('\n🔌 WebSocket ready at ws://localhost:' + API_PORT);
});

export default app;
