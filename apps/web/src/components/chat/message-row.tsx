"use client";

import type { ChatMessage } from "@forge-code/shared-types";
import { UserBubble } from "./user-bubble";
import { AssistantBubble } from "./assistant-bubble";

interface MessageRowProps {
  message: ChatMessage;
}

export function MessageRow({ message }: MessageRowProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <UserBubble content={message.content} />
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div className="flex justify-start">
        <AssistantBubble
          content={message.content}
          thinking={message.thinking}
        />
      </div>
    );
  }

  return null;
}
