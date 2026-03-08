import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1).max(100) });
const updateSchema = z.object({ name: z.string().min(1).max(100).optional() });
const inviteSchema = z.object({
  username: z.string(),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export async function workspaceRoutes(app: FastifyInstance) {
  // List user's workspaces
  app.get("/", async (req) => {
    const memberships = await app.prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: { workspace: true },
    });
    return memberships.map((m) => m.workspace);
  });

  // Create workspace
  app.post("/", async (req) => {
    const { name } = createSchema.parse(req.body);
    return app.prisma.workspace.create({
      data: {
        name,
        ownerId: req.userId,
        members: { create: { userId: req.userId, role: "owner" } },
      },
    });
  });

  // Get workspace
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const ws = await app.prisma.workspace.findFirst({
      where: { id, members: { some: { userId: req.userId } } },
      include: { members: { include: { user: true } } },
    });
    if (!ws) return reply.code(404).send({ error: "Not found" });
    return ws;
  });

  // Update workspace
  app.patch("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = updateSchema.parse(req.body);

    const ws = await app.prisma.workspace.findFirst({
      where: { id, ownerId: req.userId },
    });
    if (!ws) return reply.code(403).send({ error: "Forbidden" });

    return app.prisma.workspace.update({ where: { id }, data });
  });

  // Delete workspace
  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const ws = await app.prisma.workspace.findFirst({
      where: { id, ownerId: req.userId },
    });
    if (!ws) return reply.code(403).send({ error: "Forbidden" });

    await app.prisma.workspace.delete({ where: { id } });
    return { ok: true };
  });

  // Invite member
  app.post("/:id/members", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { username, role } = inviteSchema.parse(req.body);

    // Verify requester is owner
    const member = await app.prisma.workspaceMember.findFirst({
      where: { workspaceId: id, userId: req.userId, role: "owner" },
    });
    if (!member) return reply.code(403).send({ error: "Forbidden" });

    // Find user by telegram username
    const target = await app.prisma.user.findFirst({ where: { username } });
    if (!target) return reply.code(404).send({ error: "User not found" });

    return app.prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: id, userId: target.id } },
      update: { role },
      create: { workspaceId: id, userId: target.id, role },
    });
  });
}
