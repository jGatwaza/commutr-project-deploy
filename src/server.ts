import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import playlistRouter from './web/playlist.js';
import streakRouter from './web/streak.js';
import playbackRouter from './web/playback.js';
import agentRouter from './web/agent.js';
import historyRouter from './web/history.js';
import recommendRouter from './web/recommend.js';
import achievementsRouter from './web/achievements.js'; // HW9 CTR-C4

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distDir = path.join(__dirname, '../dist');
const legacyDir = path.join(__dirname, '../public');
const hasDist = fs.existsSync(distDir);

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

if (hasDist) {
  app.use(express.static(distDir));
} else {
  app.use(express.static(legacyDir));
}

app.use('/legacy', express.static(legacyDir));
app.use(playlistRouter);
app.use('/api', streakRouter);
app.use('/api', historyRouter);
app.use('/api', recommendRouter);
app.use('/api', achievementsRouter); // HW9 CTR-C4
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

const PORT = process.env.PORT || 5173;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}

export default app;
