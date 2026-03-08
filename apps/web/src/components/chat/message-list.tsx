"use client";

import { useRef, useEffect } from "react";
import type { ChatMessage } from "@forge-code/shared-types";
import { MessageRow } from "./message-row";
import { StreamingContent } from "./streaming-content";
import { GlassBubble } from "@/components/ui/glass-bubble";

interface MessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
  streamingThinking: string;
}

export function MessageList({ messages, streaming, streamingContent, streamingThinking }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="mx-auto max-w-3xl space-y-3">
        {messages.map((msg) => (
          <MessageRow key={msg.id} message={msg} />
        ))}

        {/* Streaming response */}
        {streaming && streamingContent && (
          <div className="flex justify-start">
            <GlassBubble>
              {streamingThinking && (
                <details className="mb-2">
                  <summary className="tracking-label cursor-pointer text-text-tertiary">
                    Thinking
                  </summary>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {streamingThinking}
                  </p>
                </details>
              )}
              <StreamingContent content={streamingContent} />
            </GlassBubble>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
