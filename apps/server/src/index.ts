import { buildApp } from "./app.js";
import { startTelegramBot } from "./services/telegram-bot.service.js";

const PORT = parseInt(process.env.SERVER_PORT || "3001", 10);

async function main() {
  const app = await buildApp();
  let bot = { stop: async () => {} };
  try {
    bot = await startTelegramBot(app);
  } catch (err) {
    app.log.error({ err }, "Failed to start Telegram bot; continuing without bot runtime");
  }

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`Forge Code server running on :${PORT}`);
  } catch (err) {
    app.log.error(err);
    await bot.stop();
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down");
    await bot.stop();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main();
