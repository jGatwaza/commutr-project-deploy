import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import notificationsRouter from './notifications/router.js';
import playerEventsRouter from './playerEvents/router.js';
import playlistRouter from './web/playlist.js';
import streakRouter from './web/streak.js';
import playbackRouter from './web/playback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/notifications', notificationsRouter);
app.use('/player-events', playerEventsRouter);
app.use(playlistRouter);
app.use('/api', streakRouter);
app.use(playbackRouter);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}

export default app;
