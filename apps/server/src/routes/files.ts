import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().default(""),
  language: z.string().max(50).optional(),
});

const updateSchema = z.object({
  content: z.string(),
});
const EDITOR_ROLES = ["owner", "editor"] as const;

export async function fileRoutes(app: FastifyInstance) {
  const canReadProject = async (projectId: string, userId: string) => {
    const project = await app.prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: { members: { some: { userId } } },
      },
      select: { id: true },
    });
    return !!project;
  };

  const canEditProject = async (projectId: string, userId: string) => {
    const project = await app.prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: { userId, role: { in: [...EDITOR_ROLES] } },
          },
        },
      },
      select: { id: true },
    });
    return !!project;
  };

  // List files in project
  app.get("/projects/:pid/files", async (req, reply) => {
    const { pid } = req.params as { pid: string };
    if (!(await canReadProject(pid, req.userId))) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    return app.prisma.file.findMany({
      where: { projectId: pid },
      orderBy: { path: "asc" },
    });
  });

  // Create file
  app.post("/projects/:pid/files", async (req, reply) => {
    const { pid } = req.params as { pid: string };
    const data = createSchema.parse(req.body);
    if (!(await canEditProject(pid, req.userId))) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const file = await app.prisma.file.create({
      data: { projectId: pid, ...data },
    });

    // Create initial version
    await app.prisma.fileVersion.create({
      data: {
        fileId: file.id,
        content: data.content,
        version: 1,
        createdById: req.userId,
      },
    });

    return file;
  });

  // Upload file (multipart)
  app.post("/projects/:pid/files/upload", async (req, reply) => {
    const { pid } = req.params as { pid: string };
    if (!(await canEditProject(pid, req.userId))) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const parts = req.parts();

    const files = [];
    for await (const part of parts) {
      if (part.type === "file") {
        const content = await part.toBuffer();
        const path = part.filename || "untitled";

        const file = await app.prisma.file.upsert({
          where: { projectId_path: { projectId: pid, path } },
          update: { content: content.toString("utf-8") },
          create: {
            projectId: pid,
            path,
            content: content.toString("utf-8"),
          },
        });

        // Create version
        const lastVersion = await app.prisma.fileVersion.findFirst({
          where: { fileId: file.id },
          orderBy: { version: "desc" },
        });

        await app.prisma.fileVersion.create({
          data: {
            fileId: file.id,
            content: content.toString("utf-8"),
            version: (lastVersion?.version ?? 0) + 1,
            createdById: req.userId,
          },
        });

        files.push(file);
      }
    }

    return { uploaded: files.length, files };
  });

  // Get file
  app.get("/files/:fid", async (req, reply) => {
    const { fid } = req.params as { fid: string };
    const file = await app.prisma.file.findFirst({
      where: {
        id: fid,
        project: { workspace: { members: { some: { userId: req.userId } } } },
      },
      include: { versions: { orderBy: { version: "desc" }, take: 10 } },
    });
    if (!file) return reply.code(404).send({ error: "Not found" });
    return file;
  });

  // Update file content
  app.put("/files/:fid", async (req, reply) => {
    const { fid } = req.params as { fid: string };
    const { content } = updateSchema.parse(req.body);
    const existing = await app.prisma.file.findFirst({
      where: {
        id: fid,
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
    if (!existing) return reply.code(404).send({ error: "Not found" });

    const file = await app.prisma.file.update({
      where: { id: fid },
      data: { content },
    });

    // New version
    const lastVersion = await app.prisma.fileVersion.findFirst({
      where: { fileId: fid },
      orderBy: { version: "desc" },
    });

    await app.prisma.fileVersion.create({
      data: {
        fileId: fid,
        content,
        version: (lastVersion?.version ?? 0) + 1,
        createdById: req.userId,
      },
    });

    return file;
  });

  // Delete file
  app.delete("/files/:fid", async (req, reply) => {
    const { fid } = req.params as { fid: string };
    const existing = await app.prisma.file.findFirst({
      where: {
        id: fid,
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
    if (!existing) return reply.code(404).send({ error: "Not found" });

    await app.prisma.file.delete({ where: { id: fid } });
    return { ok: true };
  });
}
