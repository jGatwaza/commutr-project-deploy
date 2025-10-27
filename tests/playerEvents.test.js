import request from "supertest";
import app from "../src/server.js";
import { resetAll, getAll } from "../src/playerEvents/store.js";

beforeEach(() => {
  resetAll();
});

test("accepts start and complete events", async () => {
  const base = {
    userId: "user-1",
    videoId: "video-1",
    secondsWatched: 0,
    ts: new Date().toISOString(),
    sessionId: "session-1"
  };

  await request(app)
    .post("/player-events")
    .send({ ...base, event: "start" })
    .expect(200);

  await request(app)
    .post("/player-events")
    .send({ ...base, event: "complete" })
    .expect(200);

  expect(getAll()).toHaveLength(2);
});

test("rejects invalid body", async () => {
  await request(app).post("/player-events").send({ bad: "value" }).expect(400);
});

test("dedupes progress events within same 5s bucket", async () => {
  const base = {
    userId: "user-1",
    videoId: "video-1",
    ts: new Date().toISOString(),
    sessionId: "session-1"
  };

  await request(app)
    .post("/player-events")
    .send({ ...base, event: "progress", secondsWatched: 12 })
    .expect(200);

  const response = await request(app)
    .post("/player-events")
    .send({ ...base, event: "progress", secondsWatched: 13 })
    .expect(200);

  expect(response.body.deduped).toBe(true);
  expect(getAll()).toHaveLength(1);
});

test("dedupes progress events across 5s boundary", async () => {
  const base = {
    userId: "user-1",
    videoId: "video-1",
    ts: new Date().toISOString(),
    sessionId: "session-1"
  };

  await request(app)
    .post("/player-events")
    .send({ ...base, event: "progress", secondsWatched: 9 })
    .expect(200);

  const response = await request(app)
    .post("/player-events")
    .send({ ...base, event: "progress", secondsWatched: 10 })
    .expect(200);

  expect(response.body.deduped).toBe(true);
  expect(getAll()).toHaveLength(1);
});
