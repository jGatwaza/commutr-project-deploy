import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import notificationsRouter from "./notifications/router.js";
import playerEventsRouter from "./playerEvents/router.js";
import playlistRouter from "./web/playlist.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "200kb" }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/notifications", notificationsRouter);
app.use("/player-events", playerEventsRouter);
app.use(playlistRouter);

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`server :${port}`);
  });
}

export default app;
