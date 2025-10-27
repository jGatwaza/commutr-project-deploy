import { Router } from "express";
import { z } from "zod";
import { scheduleReminder } from "./scheduler.js";

const router = Router();

const Body = z.object({
  userId: z.string().min(1),
  at: z.string().min(1)
});

router.post("/schedule", (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  try {
    const reminder = scheduleReminder(parsed.data.userId, parsed.data.at);
    return res.status(200).json(reminder);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "bad_date") {
        return res.status(400).json({ error: "bad_date" });
      }
      if (error.message === "in_past") {
        return res.status(400).json({ error: "in_past" });
      }
    }
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
