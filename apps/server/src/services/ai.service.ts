/**
 * AI provider service — replaces ollama.service.ts
 *
 * Supports:
 *   - OpenAI  (set AI_PROVIDER=openai  + OPENAI_API_KEY)
 *   - Anthropic (set AI_PROVIDER=anthropic + ANTHROPIC_API_KEY)
 *
 * The streamChat() generator yields chunks with the same shape the
 * messages route already consumes, so nothing else needs to change.
 */

const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const TIMEOUT_MS = 120_000;

/* ── OpenAI config ─────────────────────────────────────────────── */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/* ── Anthropic config ──────────────────────────────────────────── */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 4096;

/* ── Shared types (unchanged from ollama.service) ──────────────── */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatChunk {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

/* ================================================================
   OpenAI-compatible streaming (works with OpenAI, Azure, etc.)
   ================================================================ */

async function* streamOpenAI(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") {
        yield {
          model: OPENAI_MODEL,
          message: { role: "assistant", content: "" },
          done: true,
          prompt_eval_count: promptTokens,
          eval_count: completionTokens,
        };
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        // Capture usage when present (final chunk with stream_options)
        if (parsed.usage) {
          promptTokens = parsed.usage.prompt_tokens ?? 0;
          completionTokens = parsed.usage.completion_tokens ?? 0;
        }
        const delta = parsed.choices?.[0]?.delta?.content || "";
        if (delta) {
          yield {
            model: OPENAI_MODEL,
            message: { role: "assistant", content: delta },
            done: false,
          };
        }
      } catch {
        // skip malformed
      }
    }
  }

  // If we never got [DONE], still close out
  yield {
    model: OPENAI_MODEL,
    message: { role: "assistant", content: "" },
    done: true,
    prompt_eval_count: promptTokens,
    eval_count: completionTokens,
  };
}

/* ================================================================
   Anthropic Messages API streaming
   ================================================================ */

async function* streamAnthropic(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  // Anthropic uses a separate `system` param; strip system messages out
  const systemParts: string[] = [];
  const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else {
      apiMessages.push({ role: m.role as "user" | "assistant", content: m.content });
    }
  }

  // Anthropic requires alternating user/assistant. Merge consecutive same-role msgs.
  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of apiMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === m.role) {
      merged[merged.length - 1].content += "\n\n" + m.content;
    } else {
      merged.push({ ...m });
    }
  }

  // Ensure first message is from user
  if (merged.length === 0 || merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "Hello" });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: systemParts.join("\n\n") || undefined,
      messages: merged,
      stream: true,
    }),
    signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(trimmed.slice(6));

        if (event.type === "content_block_delta" && event.delta?.text) {
          yield {
            model: ANTHROPIC_MODEL,
            message: { role: "assistant", content: event.delta.text },
            done: false,
          };
        }

        if (event.type === "message_start" && event.message?.usage) {
          promptTokens = event.message.usage.input_tokens ?? 0;
        }

        if (event.type === "message_delta" && event.usage) {
          completionTokens = event.usage.output_tokens ?? 0;
        }

        if (event.type === "message_stop") {
          yield {
            model: ANTHROPIC_MODEL,
            message: { role: "assistant", content: "" },
            done: true,
            prompt_eval_count: promptTokens,
            eval_count: completionTokens,
          };
          return;
        }
      } catch {
        // skip malformed
      }
    }
  }

  yield {
    model: ANTHROPIC_MODEL,
    message: { role: "assistant", content: "" },
    done: true,
    prompt_eval_count: promptTokens,
    eval_count: completionTokens,
  };
}

/* ================================================================
   Public API — drop-in replacement for ollama.service
   ================================================================ */

export async function* streamChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  if (AI_PROVIDER === "anthropic") {
    yield* streamAnthropic(messages, signal);
  } else {
    yield* streamOpenAI(messages, signal);
  }
}

export function getModelName(): string {
  return AI_PROVIDER === "anthropic" ? ANTHROPIC_MODEL : OPENAI_MODEL;
}
