import request from 'supertest';
import app from '../src/server.js';

const AUTH = { Authorization: 'Bearer TEST' };
const hasYT = !!process.env.YOUTUBE_API_KEY;

(hasYT ? describe : describe.skip)('YouTube-backed playlist integration', () => {
  // the three tests that expect 200 with real videos go here
});

test('200 success with topic', async () => {
  const res = await request(app).get('/v1/playlist?topic=python&durationSec=900').set(AUTH);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.totalDurationSec).toBeGreaterThan(0);
});

test('400 when topic is omitted', async () => {
  const res = await request(app).get('/v1/playlist?durationSec=900').set(AUTH);
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Invalid params');
});

test('400 invalid duration', async () => {
  const res = await request(app).get('/v1/playlist?durationSec=200').set(AUTH);
  expect(res.status).toBe(400);
});

test('401 missing token', async () => {
  const res = await request(app).get('/v1/playlist?durationSec=900');
  expect(res.status).toBe(401);
});

test('204 No Content for invalid topic (original bug fix)', async () => {
  const res = await request(app).get('/v1/playlist?topic=asdfacvasdfsgf&durationSec=300').set(AUTH);
  expect(res.status).toBe(204);
  expect(res.headers['x-reason']).toBe('no_candidates');
});

test('Valid topics return 200 with proper structure', async () => {
  const res = await request(app).get('/v1/playlist?topic=cooking&durationSec=600').set(AUTH);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.totalDurationSec).toBeGreaterThan(0);
  
  // Verify each item has required fields
  if (res.body.items.length > 0) {
    const item = res.body.items[0];
    expect(item.videoId).toBeDefined();
    expect(item.durationSec).toBeGreaterThan(0);
    expect(item.title).toBeDefined();
    expect(item.channelTitle).toBeDefined();
    expect(item.level).toBeDefined();
  }
});

test('200 OK for valid topic still works', async () => {
  const res = await request(app).get('/v1/playlist?topic=javascript&durationSec=600').set(AUTH);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.totalDurationSec).toBeGreaterThan(0);
});
