interface FileContext {
  path: string;
  content: string;
  language?: string | null;
}

interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const MAX_CONTEXT_CHARS = 60_000;

const SYSTEM_PROMPT = `You are Forge Code, an expert AI coding assistant. You help users write, debug, refactor, and understand code.

## Capabilities
- Read and analyze files in the user's project
- Suggest code changes as structured patches
- Explain code, algorithms, and architectural decisions
- Write tests, documentation, and configuration files

## Code Changes
When suggesting code changes, use this format:

\`\`\`<language> // <file_path>
<full file content or relevant section>
\`\`\`

For modifications to existing files, include enough context (surrounding lines) to identify where the change should be applied.

## Guidelines
- Be concise but thorough
- Explain your reasoning briefly
- Prefer simple, idiomatic solutions
- Consider edge cases and error handling
- Use the project's existing patterns and conventions`;

export function buildMessages(
  history: PromptMessage[],
  userMessage: string,
  attachedFiles: FileContext[],
): PromptMessage[] {
  const messages: PromptMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  // Add file context
  if (attachedFiles.length > 0) {
    const fileSection = attachedFiles
      .map((f) => `### ${f.path}\n\`\`\`${f.language || ""}\n${f.content}\n\`\`\``)
      .join("\n\n");

    messages.push({
      role: "system",
      content: `## Project Files\n\n${fileSection}`,
    });
  }

  // Token budget: truncate old history if needed
  let charBudget = MAX_CONTEXT_CHARS;
  for (const msg of messages) charBudget -= msg.content.length;

  const truncatedHistory: PromptMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (charBudget - msg.content.length < 0) break;
    charBudget -= msg.content.length;
    truncatedHistory.unshift(msg);
  }

  messages.push(...truncatedHistory);
  messages.push({ role: "user", content: userMessage });

  return messages;
}
