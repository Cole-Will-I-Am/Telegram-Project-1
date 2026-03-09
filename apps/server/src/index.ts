import { buildApp } from "./app.js";
import { startTelegramBot, defaultBotConfig, secondBotConfig } from "./services/telegram-bot.service.js";

const PORT = parseInt(process.env.SERVER_PORT || "3001", 10);

async function main() {
  const app = await buildApp();

  const bots: Array<{ stop: () => Promise<void> }> = [];

  // Start primary bot
  try {
    bots.push(await startTelegramBot(app, defaultBotConfig()));
  } catch (err) {
    app.log.error({ err }, "Failed to start Telegram bot 1; continuing without bot runtime");
  }

  // Start second bot (skipped automatically if token is missing)
  try {
    bots.push(await startTelegramBot(app, secondBotConfig()));
  } catch (err) {
    app.log.error({ err }, "Failed to start Telegram bot 2; continuing without bot runtime");
  }

  const stopAllBots = async () => {
    await Promise.all(bots.map((b) => b.stop()));
  };

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`Forge Code server running on :${PORT}`);
  } catch (err) {
    app.log.error(err);
    await stopAllBots();
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down");
    await stopAllBots();
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
