"use client";

import { GlassBubble } from "@/components/ui/glass-bubble";
import { ThinkingSection } from "./thinking-section";
import { StreamingContent } from "./streaming-content";

interface AssistantBubbleProps {
  content: string;
  thinking: string | null;
}

export function AssistantBubble({ content, thinking }: AssistantBubbleProps) {
  return (
    <GlassBubble>
      {thinking && <ThinkingSection content={thinking} />}
      <StreamingContent content={content} />
    </GlassBubble>
  );
}
