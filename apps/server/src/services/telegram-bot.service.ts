import type { FastifyInstance } from "fastify";
import { buildMessages } from "./prompt.service.js";
import { streamChat } from "./ollama.service.js";

const TELEGRAM_API = "https://api.telegram.org";
const POLL_TIMEOUT_SECONDS = 30;
const RETRY_DELAY_MS = 2_000;
const TELEGRAM_TEXT_LIMIT = 4096;
const HISTORY_TTL_SECONDS = 24 * 60 * 60;
const HISTORY_TURNS = 8;
const LOCK_TTL_SECONDS = 45;
const MAX_PROMPT_CHARS = 8_000;

type ChatType = "private" | "group" | "supergroup" | "channel";
type GroupMode = "mention" | "all";

export interface TelegramBotConfig {
  token: string;
  enabled: boolean;
  groupMode: string;
  miniAppUrl: string;
  label: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name: string;
}

interface TelegramChat {
  id: number;
  type: ChatType;
}

interface TelegramEntity {
  type: string;
  offset: number;
  length: number;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
  entities?: TelegramEntity[];
  reply_to_message?: {
    from?: TelegramUser;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  description?: string;
  result: T;
}

interface TelegramBotHandle {
  stop: () => Promise<void>;
}

interface BotTurn {
  user: string;
  assistant: string;
}

interface SendTextOptions {
  replyToMessageId?: number;
  replyMarkup?: Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTelegramMessage(text: string): string[] {
  if (text.length <= TELEGRAM_TEXT_LIMIT) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > TELEGRAM_TEXT_LIMIT) {
    const slice = remaining.slice(0, TELEGRAM_TEXT_LIMIT);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
    const idx = breakAt > TELEGRAM_TEXT_LIMIT * 0.6 ? breakAt : TELEGRAM_TEXT_LIMIT;
    chunks.push(remaining.slice(0, idx).trimEnd());
    remaining = remaining.slice(idx).trimStart();
  }
  if (remaining.length) chunks.push(remaining);
  return chunks;
}

function extractCommand(message: TelegramMessage, botUsername: string): string | null {
  if (!message.text || !message.entities?.length) return null;
  const commandEntity = message.entities.find((e) => e.type === "bot_command" && e.offset === 0);
  if (!commandEntity) return null;

  const raw = message.text.slice(0, commandEntity.length);
  const [command, target] = raw.split("@");
  if (!command?.startsWith("/")) return null;
  if (target && target.toLowerCase() !== botUsername.toLowerCase()) return null;
  return command.toLowerCase();
}

function shouldRespondInGroup(
  message: TelegramMessage,
  botUsername: string,
  groupMode: GroupMode,
): boolean {
  if (!message.text) return false;

  const cmd = extractCommand(message, botUsername);
  if (cmd) return true;

  if (message.text.startsWith("/")) {
    // Ignore commands for other bots.
    return false;
  }

  const lowerText = message.text.toLowerCase();
  const mention = `@${botUsername.toLowerCase()}`;
  if (lowerText.includes(mention)) return true;

  if (message.reply_to_message?.from?.username?.toLowerCase() === botUsername.toLowerCase()) {
    return true;
  }

  return groupMode === "all";
}

function sanitizePrompt(text: string, botUsername: string): string {
  const withoutMention = text.replace(new RegExp(`@${botUsername}\\b`, "gi"), "").trim();
  return withoutMention.slice(0, MAX_PROMPT_CHARS);
}

/**
 * Returns the default bot config from environment variables (bot 1).
 */
export function defaultBotConfig(): TelegramBotConfig {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    enabled: (process.env.TELEGRAM_BOT_ENABLED || "true").toLowerCase() !== "false",
    groupMode: (process.env.TELEGRAM_BOT_GROUP_MODE || "all").toLowerCase(),
    miniAppUrl: process.env.TELEGRAM_MINIAPP_URL || "",
    label: "bot1",
  };
}

/**
 * Returns the second bot config from environment variables (bot 2).
 */
export function secondBotConfig(): TelegramBotConfig {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN_2 || "",
    enabled: (process.env.TELEGRAM_BOT_2_ENABLED || "true").toLowerCase() !== "false",
    groupMode: (process.env.TELEGRAM_BOT_2_GROUP_MODE || "all").toLowerCase(),
    miniAppUrl: process.env.TELEGRAM_BOT_2_MINIAPP_URL || "",
    label: "bot2",
  };
}

export async function startTelegramBot(
  app: FastifyInstance,
  config: TelegramBotConfig = defaultBotConfig(),
): Promise<TelegramBotHandle> {
  const { token, enabled, miniAppUrl, label } = config;
  const noop: TelegramBotHandle = { stop: async () => {} };

  if (!enabled) {
    app.log.info(`[${label}] Telegram bot disabled`);
    return noop;
  }

  if (!token) {
    app.log.warn(`[${label}] Telegram bot not started: token is missing`);
    return noop;
  }

  // --- Token-scoped helpers ---

  async function telegramApi<T>(
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`[${label}] Telegram HTTP ${res.status} ${res.statusText}`);
    }

    const payload = await res.json() as TelegramApiResponse<T>;
    if (!payload.ok) {
      throw new Error(payload.description || `[${label}] Telegram API error on ${method}`);
    }
    return payload.result;
  }

  async function sendText(chatId: number, text: string, options: SendTextOptions = {}): Promise<void> {
    const chunks = splitTelegramMessage(text);
    for (let i = 0; i < chunks.length; i++) {
      await telegramApi("sendMessage", {
        chat_id: chatId,
        text: chunks[i],
        reply_to_message_id: i === 0 ? options.replyToMessageId : undefined,
        allow_sending_without_reply: true,
        reply_markup: i === 0 ? options.replyMarkup : undefined,
      });
    }
  }

  function historyKey(chatId: number): string {
    return `telegram:${label}:history:${chatId}`;
  }

  function chatLockKey(chatId: number): string {
    return `telegram:${label}:lock:${chatId}`;
  }

  async function loadHistory(chatId: number): Promise<BotTurn[]> {
    try {
      const raw = await app.redis.get(historyKey(chatId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as BotTurn[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function saveHistory(chatId: number, turns: BotTurn[]): Promise<void> {
    try {
      const trimmed = turns.slice(-HISTORY_TURNS);
      await app.redis.set(historyKey(chatId), JSON.stringify(trimmed), "EX", HISTORY_TTL_SECONDS);
    } catch {
      // non-fatal
    }
  }

  async function registerCommands(): Promise<void> {
    await telegramApi("setMyCommands", {
      commands: [
        { command: "start", description: "Open the app and see usage help" },
        { command: "ask", description: "Ask Manticode a coding question" },
        { command: "reset", description: "Clear this chat context" },
        { command: "help", description: "Show bot commands" },
        { command: "ping", description: "Health check" },
      ],
    });
  }

  async function syncMenuButton(): Promise<void> {
    if (!miniAppUrl) {
      app.log.warn(
        `[${label}] MINIAPP_URL is not set; menu button cannot open the Mini App`,
      );
      return;
    }

    await telegramApi("setChatMenuButton", {
      menu_button: {
        type: "web_app",
        text: "Open Forge Code",
        web_app: { url: miniAppUrl },
      },
    });
  }

  async function clearHistory(chatId: number): Promise<void> {
    await app.redis.del(historyKey(chatId));
  }

  async function generateAiReply(chatId: number, prompt: string): Promise<string> {
    const turns = await loadHistory(chatId);
    const history = turns.flatMap((t) => [
      { role: "user" as const, content: t.user },
      { role: "assistant" as const, content: t.assistant },
    ]);

    const messages = buildMessages(history, prompt, []);
    let response = "";

    for await (const chunk of streamChat(messages)) {
      const text = chunk.message?.content || "";
      if (text) response += text;
    }

    const finalResponse = response.trim();
    if (finalResponse) {
      await saveHistory(chatId, [...turns, { user: prompt, assistant: finalResponse }]);
    }
    return finalResponse;
  }

  async function withChatLock<T>(
    chatId: number,
    task: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await app.redis.set(chatLockKey(chatId), "1", "EX", LOCK_TTL_SECONDS, "NX");
    if (!acquired) return null;

    try {
      return await task();
    } finally {
      await app.redis.del(chatLockKey(chatId));
    }
  }

  function startReplyMarkup() {
    if (!miniAppUrl) return undefined;
    return {
      inline_keyboard: [
        [
          {
            text: "Open Manticode Mini App",
            web_app: { url: miniAppUrl },
          },
        ],
      ],
    };
  }

  async function handleIncomingMessage(
    message: TelegramMessage,
    botUsername: string,
    groupMode: GroupMode,
  ): Promise<void> {
    if (!message.text) return;
    if (message.from?.is_bot) return;
    if (message.chat.type === "channel") return;

    const command = extractCommand(message, botUsername);
    const chatType = message.chat.type;

    if (command === "/start") {
      await sendText(
        message.chat.id,
        "Manticode is online. Use /ask <prompt> or mention me in groups. "
          + "For all group messages, disable privacy mode in BotFather.",
        { replyToMessageId: message.message_id, replyMarkup: startReplyMarkup() },
      );
      return;
    }

    if (command === "/help") {
      await sendText(
        message.chat.id,
        "Commands: /ask, /reset, /ping, /help. Group mode: "
          + groupMode
          + ". Mention @"
          + botUsername
          + " or reply to me in group chats.",
        { replyToMessageId: message.message_id },
      );
      return;
    }

    if (command === "/ping") {
      await sendText(message.chat.id, "pong", { replyToMessageId: message.message_id });
      return;
    }

    if (command === "/reset" || command === "/clear") {
      await clearHistory(message.chat.id);
      await sendText(
        message.chat.id,
        "Context cleared for this chat. I will treat the next message as a fresh conversation.",
        { replyToMessageId: message.message_id },
      );
      return;
    }

    let prompt = message.text;

    if (command === "/ask") {
      const commandToken = message.text.split(/\s+/, 1)[0] || "/ask";
      prompt = message.text.slice(commandToken.length).trim();
    } else if (chatType === "group" || chatType === "supergroup") {
      if (!shouldRespondInGroup(message, botUsername, groupMode)) return;
      prompt = sanitizePrompt(prompt, botUsername);
    }

    if (!prompt.trim()) {
      await sendText(
        message.chat.id,
        "Send a prompt after /ask, or mention me with a question.",
        { replyToMessageId: message.message_id },
      );
      return;
    }

    const result = await withChatLock(message.chat.id, async () => {
      await telegramApi("sendChatAction", { chat_id: message.chat.id, action: "typing" });
      const reply = await generateAiReply(message.chat.id, prompt);
      await sendText(
        message.chat.id,
        reply || "I couldn't generate a response for that prompt.",
        { replyToMessageId: message.message_id },
      );
    });

    if (result === null) {
      await sendText(
        message.chat.id,
        "I am still working on the previous request in this chat. Please wait a moment.",
        { replyToMessageId: message.message_id },
      );
    }
  }

  // --- Bot startup ---

  const me = await telegramApi<TelegramUser>("getMe");
  const botUsername = me.username || "unknown_bot";
  const groupMode: GroupMode = config.groupMode === "mention" ? "mention" : "all";

  await telegramApi("deleteWebhook", { drop_pending_updates: false });

  try {
    await registerCommands();
  } catch (error) {
    app.log.warn({ err: error }, `[${label}] Failed to register Telegram commands`);
  }

  try {
    await syncMenuButton();
  } catch (error) {
    app.log.warn({ err: error }, `[${label}] Failed to sync Telegram menu button`);
  }

  app.log.info(
    { label, botId: me.id, botUsername: `@${botUsername}`, groupMode, hasMiniAppUrl: !!miniAppUrl },
    `[${label}] Telegram bot long polling started`,
  );

  let stopped = false;
  let offset = 0;

  const loop = (async () => {
    while (!stopped) {
      try {
        const updates = await telegramApi<TelegramUpdate[]>("getUpdates", {
          timeout: POLL_TIMEOUT_SECONDS,
          offset,
          allowed_updates: ["message"],
        });

        for (const update of updates) {
          offset = update.update_id + 1;
          if (!update.message) continue;
          try {
            await handleIncomingMessage(update.message, botUsername, groupMode);
          } catch (error) {
            app.log.error({ err: error }, `[${label}] Telegram message handling failed`);
            await sendText(
              update.message.chat.id,
              "I hit an error while generating that response.",
              { replyToMessageId: update.message.message_id },
            );
          }
        }
      } catch (error) {
        if (stopped) break;
        app.log.error({ err: error }, `[${label}] Telegram polling failed; retrying`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  })();

  return {
    stop: async () => {
      stopped = true;
      await loop.catch(() => {});
      app.log.info(`[${label}] Telegram bot stopped`);
    },
  };
}
