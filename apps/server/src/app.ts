import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { prismaPlugin } from "./plugins/prisma.js";
import { redisPlugin } from "./plugins/redis.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { projectRoutes } from "./routes/projects.js";
import { fileRoutes } from "./routes/files.js";
import { threadRoutes } from "./routes/threads.js";
import { messageRoutes } from "./routes/messages.js";
import { patchRoutes } from "./routes/patches.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // Core plugins
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

  // Infrastructure plugins
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  // Routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(workspaceRoutes, { prefix: "/api/workspaces" });
  await app.register(projectRoutes, { prefix: "/api" });
  await app.register(fileRoutes, { prefix: "/api" });
  await app.register(threadRoutes, { prefix: "/api" });
  await app.register(messageRoutes, { prefix: "/api" });
  await app.register(patchRoutes, { prefix: "/api" });

  return app;
}
