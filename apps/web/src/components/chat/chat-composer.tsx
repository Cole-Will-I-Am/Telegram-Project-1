"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/components/ui/cn";

interface ChatComposerProps {
  onSend: (content: string) => void;
  onStop: () => void;
  streaming: boolean;
}

export function ChatComposer({ onSend, onStop, streaming }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, streaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="border-t border-border bg-bg-secondary p-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="flex-1 rounded-xl border border-border-light bg-surface">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message Forge Code..."
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-3 py-2.5 text-sm text-text-primary",
              "placeholder:text-text-tertiary outline-none",
              "max-h-40",
            )}
          />
        </div>

        {streaming ? (
          <button
            onClick={onStop}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger transition-colors hover:bg-danger/20"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="10" height="10" rx="1.5" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all",
              value.trim()
                ? "bg-accent-gradient text-white shadow-lg shadow-accent/20"
                : "bg-surface text-text-tertiary",
            )}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
