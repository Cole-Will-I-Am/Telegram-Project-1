import { createTwoFilesPatch } from "diff";

interface ParsedChange {
  filePath: string;
  language: string;
  newContent: string;
  action: "create" | "modify";
}

/**
 * Extracts annotated code blocks from model output.
 * Format: ```language // file/path.ext
 */
export function parseCodeBlocks(content: string): ParsedChange[] {
  const regex = /```(\w+)\s*\/\/\s*(.+?)\n([\s\S]*?)```/g;
  const changes: ParsedChange[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    changes.push({
      language: match[1],
      filePath: match[2].trim(),
      newContent: match[3].trimEnd(),
      action: "modify", // will be set to "create" if file doesn't exist
    });
  }

  return changes;
}

/**
 * Generates unified diff between old and new content.
 */
export function generateDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
): string {
  return createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    oldContent,
    newContent,
    "",
    "",
    { context: 3 },
  );
}
