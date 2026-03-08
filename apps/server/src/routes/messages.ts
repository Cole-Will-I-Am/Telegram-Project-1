import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { streamChat, getModelName } from "../services/ollama.service.js";
import { buildMessages } from "../services/prompt.service.js";

const sendSchema = z.object({
  content: z.string().min(1).max(10_000),
  attachedFiles: z.array(z.string()).optional(),
});
const EDITOR_ROLES = ["owner", "editor"] as const;

export async function messageRoutes(app: FastifyInstance) {
  // Send message + get streaming response
  app.post("/threads/:tid/messages", async (req, reply) => {
    const { tid } = req.params as { tid: string };
    const { content, attachedFiles: fileIds } = sendSchema.parse(req.body);

    // Verify thread and write permissions
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
      include: { project: true },
    });
    if (!thread) return reply.code(404).send({ error: "Thread not found" });

    // Save user message
    await app.prisma.chatMessage.create({
      data: { threadId: tid, role: "user", content, userId: req.userId },
    });

    // Load history
    const dbMessages = await app.prisma.chatMessage.findMany({
      where: { threadId: tid },
      orderBy: { createdAt: "asc" },
    });

    const history = dbMessages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Load attached files
    const attachedFiles: Array<{ path: string; content: string; language?: string | null }> = [];
    if (fileIds?.length) {
      const files = await app.prisma.file.findMany({
        where: { id: { in: fileIds }, projectId: thread.projectId },
      });
      attachedFiles.push(...files.map((f) => ({
        path: f.path,
        content: f.content,
        language: f.language,
      })));
    }

    // Also attach project files for context (up to 20)
    const projectFiles = await app.prisma.file.findMany({
      where: { projectId: thread.projectId },
      take: 20,
      orderBy: { updatedAt: "desc" },
    });
    for (const f of projectFiles) {
      if (!attachedFiles.find((af) => af.path === f.path)) {
        attachedFiles.push({
          path: f.path,
          content: f.content,
          language: f.language,
        });
      }
    }

    const messages = buildMessages(
      history.slice(0, -1), // exclude latest user message (added by buildMessages)
      content,
      attachedFiles,
    );

    // SSE response
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const write = (type: string, data: string) => {
      reply.raw.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    let fullContent = "";

    try {
      for await (const chunk of streamChat(messages)) {
        const text = chunk.message?.content || "";
        if (text) {
          fullContent += text;
          write("delta", text);
        }

        if (chunk.done) {
          // Save assistant message
          await app.prisma.chatMessage.create({
            data: { threadId: tid, role: "assistant", content: fullContent },
          });

          // Update thread timestamp
          await app.prisma.chatThread.update({
            where: { id: tid },
            data: { updatedAt: new Date() },
          });

          // Usage tracking
          if (chunk.prompt_eval_count || chunk.eval_count) {
            await app.prisma.usageRecord.create({
              data: {
                userId: req.userId,
                model: getModelName(),
                promptTokens: chunk.prompt_eval_count ?? 0,
                completionTokens: chunk.eval_count ?? 0,
              },
            });
          }

          write("done", JSON.stringify({
            promptTokens: chunk.prompt_eval_count ?? 0,
            completionTokens: chunk.eval_count ?? 0,
            duration: chunk.total_duration ?? 0,
          }));
        }
      }
    } catch (err) {
      write("error", (err as Error).message);
    }

    reply.raw.write("data: [DONE]\n\n");
    reply.raw.end();
  });
}
