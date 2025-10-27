import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const publicDir = path.join(__dirname, 'public');

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json' });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^\/+/, '');
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    send(res, 403, 'Forbidden');
    return true;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const data = fs.readFileSync(filePath);
  send(res, 200, data, { 'Content-Type': contentTypeFor(filePath) });
  return true;
}

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url || '/');
  if (req.method === 'GET') {
    if (pathname === '/' || pathname === '/index.html') {
      const indexFile = path.join(publicDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        const data = fs.readFileSync(indexFile);
        send(res, 200, data, { 'Content-Type': 'text/html; charset=utf-8' });
      } else {
        send(res, 404, 'Not Found');
      }
      return;
    }
    if (pathname === '/login.html') {
      const loginFile = path.join(publicDir, 'login.html');
      if (fs.existsSync(loginFile)) {
        const data = fs.readFileSync(loginFile);
        send(res, 200, data, { 'Content-Type': 'text/html; charset=utf-8' });
      } else {
        send(res, 404, 'Not Found');
      }
      return;
    }
    if (pathname === '/app.js') {
      if (!serveStatic(req, res, 'app.js')) send(res, 404, 'Not Found');
      return;
    }
    if (pathname && pathname.startsWith('/public/')) {
      const rel = pathname.replace('/public/', '');
      if (!serveStatic(req, res, rel)) send(res, 404, 'Not Found');
      return;
    }
  }
  if (req.method === 'POST' && pathname === '/api/build-pack') {
    // Build pack functionality temporarily disabled during ES module transition
    sendJson(res, 501, { error: 'Build pack API temporarily unavailable' });
    return;
  }
  send(res, 404, 'Not Found');
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
