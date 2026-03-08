import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { validateInitData } from "../services/telegram-auth.service.js";
import { signToken } from "../plugins/auth.js";

const loginSchema = z.object({ initData: z.string() });

export async function authRoutes(app: FastifyInstance) {
  app.post("/telegram", async (req, reply) => {
    const { initData } = loginSchema.parse(req.body);

    let validated;
    try {
      validated = validateInitData(initData);
    } catch (e) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: (e as Error).message,
      });
    }

    const { user: tgUser } = validated;
    const telegramId = String(tgUser.id);

    // Upsert user
    const user = await app.prisma.user.upsert({
      where: { telegramId },
      update: {
        username: tgUser.username ?? null,
        displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
        avatarUrl: tgUser.photo_url ?? null,
      },
      create: {
        telegramId,
        username: tgUser.username ?? null,
        displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
        avatarUrl: tgUser.photo_url ?? null,
      },
    });

    // Create default workspace on first login
    const existing = await app.prisma.workspaceMember.findFirst({
      where: { userId: user.id },
    });

    if (!existing) {
      const ws = await app.prisma.workspace.create({
        data: {
          name: `${tgUser.first_name}'s Workspace`,
          ownerId: user.id,
          members: {
            create: { userId: user.id, role: "owner" },
          },
        },
      });
    }

    const token = signToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
    };
  });
}
