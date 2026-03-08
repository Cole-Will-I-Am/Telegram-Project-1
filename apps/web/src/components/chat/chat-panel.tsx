"use client";

import { MessageList } from "./message-list";
import { ChatComposer } from "./chat-composer";
import { TypingIndicator } from "./typing-indicator";
import { ActionChips } from "./action-chips";
import { useChatStore } from "@/stores/chat";
import { useUIStore } from "@/stores/ui";

interface ChatPanelProps {
  threadId: string;
}

export function ChatPanel({ threadId }: ChatPanelProps) {
  const { messages, streaming, streamingContent, streamingThinking, sendMessage, stopStreaming } =
    useChatStore();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleSend = (content: string) => {
    sendMessage(threadId, content);
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={toggleSidebar}
          className="text-text-secondary hover:text-text-primary md:hidden"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm font-medium">Forge Code</span>
        </div>
      </header>

      {/* Messages */}
      <MessageList
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
        streamingThinking={streamingThinking}
      />

      {/* Typing indicator */}
      {streaming && !streamingContent && <TypingIndicator />}

      {/* Action chips */}
      {!streaming && messages.length > 0 && (
        <ActionChips onSelect={(prompt) => handleSend(prompt)} />
      )}

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        onStop={stopStreaming}
        streaming={streaming}
      />
    </div>
  );
}
