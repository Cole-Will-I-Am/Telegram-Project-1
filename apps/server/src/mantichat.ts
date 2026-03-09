import { startMantiBot } from "./services/manti-bot.service.js";

async function main() {
  console.log("Starting Mantichat...");

  const bot = await startMantiBot();

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    await bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
