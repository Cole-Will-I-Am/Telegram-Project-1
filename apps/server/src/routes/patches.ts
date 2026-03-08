import type { FastifyInstance } from "fastify";
import { parseCodeBlocks, generateDiff } from "../services/patch-parser.service.js";

export async function patchRoutes(app: FastifyInstance) {
  // List patches for a project
  app.get("/projects/:pid/patches", async (req) => {
    const { pid } = req.params as { pid: string };
    return app.prisma.patchProposal.findMany({
      where: { projectId: pid },
      orderBy: { createdAt: "desc" },
      include: { changes: true, createdBy: true },
    });
  });

  // Get patch detail
  app.get("/patches/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = await app.prisma.patchProposal.findUnique({
      where: { id },
      include: { changes: true, createdBy: true, message: true },
    });
    if (!patch) return reply.code(404).send({ error: "Not found" });
    return patch;
  });

  // Create patch from a message (called internally after model responds)
  app.post("/patches/from-message", async (req) => {
    const { messageId, projectId, threadId } = req.body as {
      messageId: string;
      projectId: string;
      threadId: string;
    };

    const message = await app.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new Error("Message not found");

    const parsed = parseCodeBlocks(message.content);
    if (parsed.length === 0) return { created: false };

    // Build changes with diffs
    const changeData = [];
    for (const change of parsed) {
      const existingFile = await app.prisma.file.findFirst({
        where: { projectId, path: change.filePath },
      });

      const action = existingFile ? "modify" : "create";
      const oldContent = existingFile?.content || "";
      const diff = generateDiff(change.filePath, oldContent, change.newContent);

      changeData.push({
        fileId: existingFile?.id ?? null,
        filePath: change.filePath,
        action,
        diff,
        newContent: change.newContent,
      });
    }

    const patch = await app.prisma.patchProposal.create({
      data: {
        projectId,
        threadId,
        messageId,
        title: `Code changes (${changeData.length} file${changeData.length > 1 ? "s" : ""})`,
        createdById: req.userId,
        changes: { create: changeData },
      },
      include: { changes: true },
    });

    return { created: true, patch };
  });

  // Approve patch
  app.post("/patches/:id/approve", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = await app.prisma.patchProposal.findUnique({ where: { id } });
    if (!patch) return reply.code(404).send({ error: "Not found" });
    if (patch.status !== "pending") {
      return reply.code(400).send({ error: "Patch is not pending" });
    }

    return app.prisma.patchProposal.update({
      where: { id },
      data: { status: "approved" },
    });
  });

  // Reject patch
  app.post("/patches/:id/reject", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = await app.prisma.patchProposal.findUnique({ where: { id } });
    if (!patch) return reply.code(404).send({ error: "Not found" });

    return app.prisma.patchProposal.update({
      where: { id },
      data: { status: "rejected" },
    });
  });

  // Apply patch — actually update files
  app.post("/patches/:id/apply", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = await app.prisma.patchProposal.findUnique({
      where: { id },
      include: { changes: true },
    });
    if (!patch) return reply.code(404).send({ error: "Not found" });
    if (patch.status !== "approved") {
      return reply.code(400).send({ error: "Patch must be approved first" });
    }

    // Apply each change
    for (const change of patch.changes) {
      if (change.action === "create") {
        const file = await app.prisma.file.create({
          data: {
            projectId: patch.projectId,
            path: change.filePath,
            content: change.newContent,
          },
        });
        await app.prisma.fileVersion.create({
          data: {
            fileId: file.id,
            content: change.newContent,
            version: 1,
            createdById: req.userId,
          },
        });
      } else if (change.action === "modify" && change.fileId) {
        await app.prisma.file.update({
          where: { id: change.fileId },
          data: { content: change.newContent },
        });

        const lastVersion = await app.prisma.fileVersion.findFirst({
          where: { fileId: change.fileId },
          orderBy: { version: "desc" },
        });

        await app.prisma.fileVersion.create({
          data: {
            fileId: change.fileId,
            content: change.newContent,
            version: (lastVersion?.version ?? 0) + 1,
            createdById: req.userId,
          },
        });
      }
    }

    // Update status
    const updated = await app.prisma.patchProposal.update({
      where: { id },
      data: { status: "applied" },
      include: { changes: true },
    });

    // Activity
    await app.prisma.activityEvent.create({
      data: {
        workspaceId: (await app.prisma.project.findUnique({ where: { id: patch.projectId } }))!.workspaceId,
        projectId: patch.projectId,
        userId: req.userId,
        type: "patch_applied",
        metadata: { patchId: id, filesChanged: patch.changes.length },
      },
    });

    return updated;
  });
}
