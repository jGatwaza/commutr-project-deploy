import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { saveEvent, alreadySaw, markSeen } from "./store.js";

const router = Router();

const Body = z.object({
  userId: z.string().min(1),
  videoId: z.string().min(1),
  event: z.enum(["start", "progress", "complete"]),
  secondsWatched: z.number().int().min(0),
  ts: z.string().min(1),
  sessionId: z.string().min(1)
});

const limiter = rateLimit({ windowMs: 60_000, max: 120 });

router.post("/", limiter, (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const event = parsed.data;
  const bucket = Math.floor(event.secondsWatched / 5);
  const key = `${event.sessionId}:${event.event}:${bucket}`;

  if (event.event === "progress" && alreadySaw(key)) {
    return res.status(200).json({ ok: true, deduped: true });
  }

  if (event.event === "progress") {
    markSeen(key);
  }

  saveEvent(event);
  return res.status(200).json({ ok: true });
});

export default router;
