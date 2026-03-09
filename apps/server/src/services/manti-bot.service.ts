import { streamChat, listModels } from "./ollama.service.js";

const TELEGRAM_API = "https://api.telegram.org";
const BOT_TOKEN = process.env.MANTI_BOT_TOKEN || "";
const DEFAULT_MODEL = process.env.MANTI_DEFAULT_MODEL || "llama3.1:8b";
const POLL_TIMEOUT_SECONDS = 30;
const RETRY_DELAY_MS = 2_000;
const TELEGRAM_TEXT_LIMIT = 4096;
const HISTORY_TURNS = 12;
const MAX_PROMPT_CHARS = 8_000;

type ChatType = "private" | "group" | "supergroup" | "channel";

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

interface MantiBotHandle {
  stop: () => Promise<void>;
}

interface BotTurn {
  user: string;
  assistant: string;
}

// In-memory stores (no Redis needed)
const chatHistory = new Map<number, BotTurn[]>();
const chatModels = new Map<number, string>();
const chatLocks = new Set<number>();

const SYSTEM_PROMPT = `You are Mantichat, a friendly and knowledgeable conversational AI assistant. You help users with a wide range of topics including general knowledge, creative writing, brainstorming, analysis, math, science, and everyday questions.

## Personality
- Warm, approachable, and conversational
- Concise but thorough — give clear answers without unnecessary filler
- Honest about uncertainty — say when you don't know something
- Adaptable tone — match the user's energy (casual or formal)

## Guidelines
- Keep responses focused and helpful
- Use markdown formatting when it helps readability
- For complex topics, break things down step by step
- Be direct — answer the question first, then elaborate if needed`;

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
    const idx =
      breakAt > TELEGRAM_TEXT_LIMIT * 0.6 ? breakAt : TELEGRAM_TEXT_LIMIT;
    chunks.push(remaining.slice(0, idx).trimEnd());
    remaining = remaining.slice(idx).trimStart();
  }
  if (remaining.length) chunks.push(remaining);
  return chunks;
}

async function telegramApi<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Telegram HTTP ${res.status} ${res.statusText}`);
  }

  const payload = (await res.json()) as TelegramApiResponse<T>;
  if (!payload.ok) {
    throw new Error(payload.description || `Telegram API error on ${method}`);
  }
  return payload.result;
}

function extractCommand(
  message: TelegramMessage,
  botUsername: string,
): string | null {
  if (!message.text || !message.entities?.length) return null;
  const commandEntity = message.entities.find(
    (e) => e.type === "bot_command" && e.offset === 0,
  );
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
): boolean {
  if (!message.text) return false;

  const cmd = extractCommand(message, botUsername);
  if (cmd) return true;

  if (message.text.startsWith("/")) return false;

  const lowerText = message.text.toLowerCase();
  const mention = `@${botUsername.toLowerCase()}`;
  if (lowerText.includes(mention)) return true;

  if (
    message.reply_to_message?.from?.username?.toLowerCase() ===
    botUsername.toLowerCase()
  ) {
    return true;
  }

  return false;
}

function sanitizePrompt(text: string, botUsername: string): string {
  const withoutMention = text
    .replace(new RegExp(`@${botUsername}\\b`, "gi"), "")
    .trim();
  return withoutMention.slice(0, MAX_PROMPT_CHARS);
}

async function sendText(chatId: number, text: string, replyToMessageId?: number): Promise<void> {
  const chunks = splitTelegramMessage(text);
  for (let i = 0; i < chunks.length; i++) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      reply_to_message_id: i === 0 ? replyToMessageId : undefined,
      allow_sending_without_reply: true,
    });
  }
}

function loadHistory(chatId: number): BotTurn[] {
  return chatHistory.get(chatId) || [];
}

function saveHistory(chatId: number, turns: BotTurn[]): void {
  chatHistory.set(chatId, turns.slice(-HISTORY_TURNS));
}

function getSelectedModel(chatId: number): string {
  return chatModels.get(chatId) || DEFAULT_MODEL;
}

function setSelectedModel(chatId: number, model: string): void {
  chatModels.set(chatId, model);
}

function clearHistory(chatId: number): void {
  chatHistory.delete(chatId);
}

async function generateReply(
  chatId: number,
  prompt: string,
): Promise<string> {
  const turns = loadHistory(chatId);
  const model = getSelectedModel(chatId);

  const history = turns.flatMap((t) => [
    { role: "user" as const, content: t.user },
    { role: "assistant" as const, content: t.assistant },
  ]);

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: prompt },
    ];

  let response = "";
  for await (const chunk of streamChat(messages, undefined, model)) {
    const text = chunk.message?.content || "";
    if (text) response += text;
  }

  const finalResponse = response.trim();
  if (finalResponse) {
    saveHistory(chatId, [
      ...turns,
      { user: prompt, assistant: finalResponse },
    ]);
  }
  return finalResponse;
}

async function withChatLock<T>(
  chatId: number,
  task: () => Promise<T>,
): Promise<T | null> {
  if (chatLocks.has(chatId)) return null;
  chatLocks.add(chatId);

  try {
    return await task();
  } finally {
    chatLocks.delete(chatId);
  }
}

async function handleModelCommand(
  message: TelegramMessage,
  argument: string,
): Promise<void> {
  const chatId = message.chat.id;

  if (!argument) {
    let models: string[];
    try {
      models = await listModels();
    } catch {
      await sendText(chatId, "Could not reach Ollama to list models. Is it running?", message.message_id);
      return;
    }

    if (models.length === 0) {
      await sendText(chatId, "No models found in Ollama. Pull a model first with `ollama pull <model>`.", message.message_id);
      return;
    }

    const current = getSelectedModel(chatId);
    const lines = models.map((m) => (m === current ? `  • ${m} ✓` : `  • ${m}`));
    await sendText(
      chatId,
      `Available models:\n${lines.join("\n")}\n\nCurrent: ${current}\n\nSwitch with: /model <name>`,
      message.message_id,
    );
    return;
  }

  let models: string[];
  try {
    models = await listModels();
  } catch {
    await sendText(chatId, "Could not reach Ollama to verify the model.", message.message_id);
    return;
  }

  const match = models.find(
    (m) => m.toLowerCase() === argument.toLowerCase(),
  );

  if (!match) {
    await sendText(
      chatId,
      `Model "${argument}" not found. Use /model to see available models.`,
      message.message_id,
    );
    return;
  }

  setSelectedModel(chatId, match);
  await sendText(chatId, `Switched to model: ${match}`, message.message_id);
}

async function registerCommands(): Promise<void> {
  await telegramApi("setMyCommands", {
    commands: [
      { command: "start", description: "Start chatting with Mantichat" },
      { command: "model", description: "List or switch Ollama models" },
      { command: "reset", description: "Clear conversation history" },
      { command: "help", description: "Show bot commands" },
      { command: "ping", description: "Health check" },
    ],
  });
}

async function handleIncomingMessage(
  message: TelegramMessage,
  botUsername: string,
): Promise<void> {
  if (!message.text) return;
  if (message.from?.is_bot) return;
  if (message.chat.type === "channel") return;

  const command = extractCommand(message, botUsername);
  const chatType = message.chat.type;

  if (command === "/start") {
    const currentModel = getSelectedModel(message.chat.id);
    await sendText(
      message.chat.id,
      `Hey! I'm Mantichat, your conversational AI assistant.\n\nJust send me a message and I'll do my best to help.\n\nCurrently using: ${currentModel}\nSwitch models with /model`,
      message.message_id,
    );
    return;
  }

  if (command === "/help") {
    await sendText(
      message.chat.id,
      "Commands:\n"
        + "/model — List or switch Ollama models\n"
        + "/reset — Clear conversation history\n"
        + "/ping — Health check\n"
        + "/help — Show this message\n\n"
        + "In groups, mention @"
        + botUsername
        + " or reply to my messages.",
      message.message_id,
    );
    return;
  }

  if (command === "/ping") {
    const model = getSelectedModel(message.chat.id);
    await sendText(message.chat.id, `pong (model: ${model})`, message.message_id);
    return;
  }

  if (command === "/reset" || command === "/clear") {
    clearHistory(message.chat.id);
    await sendText(
      message.chat.id,
      "Conversation cleared. Send me a new message to start fresh.",
      message.message_id,
    );
    return;
  }

  if (command === "/model") {
    const commandToken = message.text.split(/\s+/, 1)[0] || "/model";
    const argument = message.text.slice(commandToken.length).trim();
    await handleModelCommand(message, argument);
    return;
  }

  let prompt = message.text;

  if (chatType === "group" || chatType === "supergroup") {
    if (!shouldRespondInGroup(message, botUsername)) return;
    prompt = sanitizePrompt(prompt, botUsername);
  }

  if (!prompt.trim()) {
    await sendText(
      message.chat.id,
      "Send me a message and I'll respond!",
      message.message_id,
    );
    return;
  }

  const result = await withChatLock(message.chat.id, async () => {
    await telegramApi("sendChatAction", {
      chat_id: message.chat.id,
      action: "typing",
    });
    const reply = await generateReply(message.chat.id, prompt);
    await sendText(
      message.chat.id,
      reply || "I couldn't generate a response. Try again or switch models with /model.",
      message.message_id,
    );
  });

  if (result === null) {
    await sendText(
      message.chat.id,
      "I'm still working on the previous message. Please wait a moment.",
      message.message_id,
    );
  }
}

export async function startMantiBot(): Promise<MantiBotHandle> {
  if (!BOT_TOKEN) {
    console.warn("Mantichat bot not started: MANTI_BOT_TOKEN is missing");
    return { stop: async () => {} };
  }

  const me = await telegramApi<TelegramUser>("getMe");
  const botUsername = me.username || "unknown_bot";

  await telegramApi("deleteWebhook", { drop_pending_updates: false });

  try {
    await registerCommands();
  } catch (error) {
    console.warn("Failed to register Mantichat commands:", error);
  }

  console.log(`Mantichat bot started as @${botUsername}`);

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
            await handleIncomingMessage(update.message, botUsername);
          } catch (error) {
            console.error("Mantichat message handling failed:", error);
            await sendText(
              update.message.chat.id,
              "I hit an error while generating that response.",
              update.message.message_id,
            );
          }
        }
      } catch (error) {
        if (stopped) break;
        console.error("Mantichat polling failed; retrying:", error);
        await sleep(RETRY_DELAY_MS);
      }
    }
  })();

  return {
    stop: async () => {
      stopped = true;
      await loop.catch(() => {});
      console.log("Mantichat bot stopped");
    },
  };
}
