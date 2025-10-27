import 'dotenv/config';
import express from 'express';
import path from 'path';
import playlistRouter from './web/playlist';
import streakRouter from './web/streak';
const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(playlistRouter);
app.use('/api', streakRouter);
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}
export default app;
