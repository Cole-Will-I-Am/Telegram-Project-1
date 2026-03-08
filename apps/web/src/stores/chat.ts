"use client";

import { create } from "zustand";
import type { ChatThread, ChatMessage, SSEEventType } from "@forge-code/shared-types";
import { api } from "@/lib/api";

interface ChatState {
  threads: ChatThread[];
  activeThread: ChatThread | null;
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
  streamingThinking: string;
  abortController: AbortController | null;

  fetchThreads: (projectId: string) => Promise<void>;
  ensureDefaultThread: (projectId: string) => Promise<ChatThread>;
  setActiveThread: (t: ChatThread | null) => void;
  fetchMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, content: string, attachedFiles?: string[]) => Promise<void>;
  stopStreaming: () => void;
  createThread: (projectId: string, title: string) => Promise<ChatThread>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  threads: [],
  activeThread: null,
  messages: [],
  streaming: false,
  streamingContent: "",
  streamingThinking: "",
  abortController: null,

  fetchThreads: async (projectId) => {
    const threads = await api.get<ChatThread[]>(`/api/projects/${projectId}/threads`);
    set({ threads });
  },

  ensureDefaultThread: async (projectId) => {
    await get().fetchThreads(projectId);
    const existing = get().threads[0];
    if (existing) return existing;
    const created = await get().createThread(projectId, "New Chat");
    set({ threads: [created], activeThread: created });
    return created;
  },

  setActiveThread: (t) => {
    set({ activeThread: t, messages: [], streamingContent: "", streamingThinking: "" });
    if (t) get().fetchMessages(t.id);
  },

  fetchMessages: async (threadId) => {
    const messages = await api.get<ChatMessage[]>(`/api/threads/${threadId}/messages`);
    set({ messages });
  },

  createThread: async (projectId, title) => {
    const thread = await api.post<ChatThread>(`/api/projects/${projectId}/threads`, { title });
    set((s) => ({ threads: [thread, ...s.threads] }));
    return thread;
  },

  sendMessage: async (threadId, content, attachedFiles) => {
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      threadId,
      role: "user",
      content,
      thinking: null,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      streaming: true,
      streamingContent: "",
      streamingThinking: "",
    }));

    const abort = new AbortController();
    set({ abortController: abort });

    try {
      const url = api.streamUrl(`/api/threads/${threadId}/messages`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({ content, attachedFiles }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

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
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;

          try {
            const event = JSON.parse(raw) as { type: SSEEventType; data: string };

            switch (event.type) {
              case "delta":
                set((s) => ({ streamingContent: s.streamingContent + event.data }));
                break;
              case "thinking":
                set((s) => ({ streamingThinking: s.streamingThinking + event.data }));
                break;
              case "done": {
                const assistantMsg: ChatMessage = {
                  id: `msg-${Date.now()}`,
                  threadId,
                  role: "assistant",
                  content: get().streamingContent,
                  thinking: get().streamingThinking || null,
                  createdAt: new Date().toISOString(),
                };
                set((s) => ({
                  messages: [...s.messages, assistantMsg],
                  streaming: false,
                  streamingContent: "",
                  streamingThinking: "",
                  abortController: null,
                }));
                break;
              }
              case "error":
                set({ streaming: false, abortController: null });
                break;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        set({ streaming: false, abortController: null });
      }
    }
  },

  stopStreaming: () => {
    const { abortController, streamingContent, streamingThinking } = get();
    abortController?.abort();

    if (streamingContent) {
      const partialMsg: ChatMessage = {
        id: `msg-partial-${Date.now()}`,
        threadId: get().activeThread?.id || "",
        role: "assistant",
        content: streamingContent,
        thinking: streamingThinking || null,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, partialMsg],
        streaming: false,
        streamingContent: "",
        streamingThinking: "",
        abortController: null,
      }));
    } else {
      set({ streaming: false, abortController: null });
    }
  },
}));
