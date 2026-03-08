"use client";

interface ThinkingSectionProps {
  content: string;
}

export function ThinkingSection({ content }: ThinkingSectionProps) {
  return (
    <details className="mb-3 rounded-lg bg-white/[0.02] p-2">
      <summary className="tracking-label cursor-pointer select-none text-text-tertiary hover:text-text-secondary">
        Thinking
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-text-tertiary">
        {content}
      </p>
    </details>
  );
}
