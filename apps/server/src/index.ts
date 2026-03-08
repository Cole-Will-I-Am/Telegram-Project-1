import { buildApp } from "./app.js";

const PORT = parseInt(process.env.SERVER_PORT || "3001", 10);

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`Forge Code server running on :${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
