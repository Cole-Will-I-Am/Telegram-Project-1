import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const SKIP_AUTH = ["/api/auth/", "/api/health", "/api/ready"];

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("userId", "");

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (SKIP_AUTH.some((p) => req.url.startsWith(p))) return;

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized", message: "Missing token" });
    }

    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
      req.userId = payload.sub;
    } catch {
      return reply.code(401).send({ error: "Unauthorized", message: "Invalid token" });
    }
  });
});

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "24h" });
}
