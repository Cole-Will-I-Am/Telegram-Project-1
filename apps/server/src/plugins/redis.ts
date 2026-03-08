import fp from "fastify-plugin";
import Redis from "ioredis";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (app: FastifyInstance) => {
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    redis.disconnect();
  });
});
