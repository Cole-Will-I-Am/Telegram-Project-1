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

export async function fileRoutes(app: FastifyInstance) {
  // List files in project
  app.get("/projects/:pid/files", async (req) => {
    const { pid } = req.params as { pid: string };
    return app.prisma.file.findMany({
      where: { projectId: pid },
      orderBy: { path: "asc" },
    });
  });

  // Create file
  app.post("/projects/:pid/files", async (req) => {
    const { pid } = req.params as { pid: string };
    const data = createSchema.parse(req.body);

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
    const file = await app.prisma.file.findUnique({
      where: { id: fid },
      include: { versions: { orderBy: { version: "desc" }, take: 10 } },
    });
    if (!file) return reply.code(404).send({ error: "Not found" });
    return file;
  });

  // Update file content
  app.put("/files/:fid", async (req) => {
    const { fid } = req.params as { fid: string };
    const { content } = updateSchema.parse(req.body);

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
  app.delete("/files/:fid", async (req) => {
    const { fid } = req.params as { fid: string };
    await app.prisma.file.delete({ where: { id: fid } });
    return { ok: true };
  });
}
