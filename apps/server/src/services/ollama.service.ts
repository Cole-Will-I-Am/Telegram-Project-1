const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:14b";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const TIMEOUT_MS = 120_000;

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChunk {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

export async function listModels(): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (OLLAMA_API_KEY) {
    headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { models: { name: string }[] };
  return (data.models || []).map((m) => m.name);
}

export async function* streamChat(
  messages: OllamaMessage[],
  signal?: AbortSignal,
  model?: string,
): AsyncGenerator<OllamaChunk> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (OLLAMA_API_KEY) {
    headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model || OLLAMA_MODEL,
      messages,
      stream: true,
    }),
    signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line) as OllamaChunk;
      } catch {
        // skip malformed
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer) as OllamaChunk;
    } catch {
      // skip
    }
  }
}

export function getModelName(): string {
  return OLLAMA_MODEL;
}
