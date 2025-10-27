import express from "express";
import notificationsRouter from "./notifications/router.js";

const app = express();

app.use(express.json({ limit: "200kb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/notifications", notificationsRouter);

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`server :${port}`);
  });
}

export default app;
