import { createServer } from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { config, getActiveVisionModel } from "./config";
import { connectDb } from "./db";
import billsRouter from "./routes/bills";
import authRouter, { usersRouter } from "./routes/auth";
import roomsRouter from "./routes/rooms";
import { startCleanupScheduler } from "./services/cleanup";
import { initSocket } from "./sockets";
import { corsOptions } from "./config/cors";
import { logNetworkInfo } from "./utils/networkUrl";

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/bills", billsRouter);
app.use("/rooms", roomsRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

const httpServer = createServer(app);
let server = httpServer;

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`);

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  await mongoose.connection.close().catch(() => undefined);
  process.exit(0);
}

async function main() {
  await connectDb();
  startCleanupScheduler();
  initSocket(httpServer);

  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(`SplitSnap API running on http://localhost:${config.port}`);
    logNetworkInfo();
    console.log(
      `Bill parser: ${config.parserMode}` +
        (config.parserMode === "vision"
          ? ` (${config.visionProvider}/${getActiveVisionModel()})`
          : "")
    );
  });

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${config.port} is already in use. Run: pnpm free-port`
      );
      process.exit(1);
    }
    throw err;
  });

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
