import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createSchema = z.object({ title: z.string().min(1).max(200) });
const EDITOR_ROLES = ["owner", "editor"] as const;

export async function threadRoutes(app: FastifyInstance) {
  // List threads in project
  app.get("/projects/:pid/threads", async (req, reply) => {
    const { pid } = req.params as { pid: string };
    const project = await app.prisma.project.findFirst({
      where: {
        id: pid,
        workspace: { members: { some: { userId: req.userId } } },
      },
    });
    if (!project) return reply.code(403).send({ error: "Forbidden" });

    const threads = await app.prisma.chatThread.findMany({
      where: { projectId: pid },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });

    return threads.map((t: {
      id: string;
      projectId: string;
      title: string;
      createdById: string;
      createdAt: Date;
      updatedAt: Date;
      _count: { messages: number };
    }) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      createdById: t.createdById,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messageCount: t._count.messages,
    }));
  });

  // Create thread
  app.post("/projects/:pid/threads", async (req, reply) => {
    const { pid } = req.params as { pid: string };
    const { title } = createSchema.parse(req.body);
    const project = await app.prisma.project.findFirst({
      where: {
        id: pid,
        workspace: {
          members: {
            some: { userId: req.userId, role: { in: [...EDITOR_ROLES] } },
          },
        },
      },
    });
    if (!project) return reply.code(403).send({ error: "Forbidden" });

    return app.prisma.chatThread.create({
      data: { projectId: pid, title, createdById: req.userId },
    });
  });

  // Get thread
  app.get("/threads/:tid", async (req, reply) => {
    const { tid } = req.params as { tid: string };
    const thread = await app.prisma.chatThread.findFirst({
      where: {
        id: tid,
        project: { workspace: { members: { some: { userId: req.userId } } } },
      },
      include: { _count: { select: { messages: true } } },
    });
    if (!thread) return reply.code(404).send({ error: "Not found" });
    return {
      ...thread,
      messageCount: thread._count.messages,
    };
  });

  // Get messages for thread
  app.get("/threads/:tid/messages", async (req, reply) => {
    const { tid } = req.params as { tid: string };
    const thread = await app.prisma.chatThread.findFirst({
      where: {
        id: tid,
        project: { workspace: { members: { some: { userId: req.userId } } } },
      },
      select: { id: true },
    });
    if (!thread) return reply.code(404).send({ error: "Not found" });

    return app.prisma.chatMessage.findMany({
      where: { threadId: tid },
      orderBy: { createdAt: "asc" },
    });
  });

  // Delete thread
  app.delete("/threads/:tid", async (req, reply) => {
    const { tid } = req.params as { tid: string };
    const thread = await app.prisma.chatThread.findFirst({
      where: {
        id: tid,
        project: {
          workspace: {
            members: {
              some: { userId: req.userId, role: { in: [...EDITOR_ROLES] } },
            },
          },
        },
      },
      select: { id: true },
    });
    if (!thread) return reply.code(404).send({ error: "Not found" });

    await app.prisma.chatThread.delete({ where: { id: tid } });
    return { ok: true };
  });
}
