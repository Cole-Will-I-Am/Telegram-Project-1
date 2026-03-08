"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/stores/workspace";
import { useChatStore } from "@/stores/chat";

type Mode = "chats" | "projects";

export function Sidebar() {
  const [mode, setMode] = useState<Mode>("chats");
  const router = useRouter();
  const pathname = usePathname();
  const threads = useChatStore((s) => s.threads);
  const projects = useWorkspaceStore((s) => s.projects);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="bg-accent-gradient bg-clip-text text-lg font-bold text-transparent">
          Forge Code
        </h1>
      </div>

      {/* Mode toggle */}
      <div className="mx-4 mb-3 flex rounded-xl bg-bg-tertiary p-1">
        {(["chats", "projects"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all",
              mode === m
                ? "bg-surface-elevated text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {m === "chats" ? "Chats" : "Projects"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2">
        {mode === "chats" ? (
          threads.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-text-tertiary">
              No chats yet
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/chat/${t.id}`)}
                className={cn(
                  "mb-0.5 flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors",
                  pathname === `/chat/${t.id}`
                    ? "bg-accent-soft"
                    : "hover:bg-white/[0.03]",
                )}
              >
                <span className="truncate text-sm text-text-primary">
                  {t.title}
                </span>
                <span className="mt-0.5 text-[10px] text-text-tertiary">
                  {t.messageCount ?? 0} messages
                </span>
              </button>
            ))
          )
        ) : projects.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-text-tertiary">
            No projects yet
          </p>
        ) : (
          projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/project/${p.id}`)}
              className={cn(
                "mb-0.5 flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors",
                pathname === `/project/${p.id}`
                  ? "bg-accent-soft"
                  : "hover:bg-white/[0.03]",
              )}
            >
              <span className="truncate text-sm text-text-primary">
                {p.name}
              </span>
              {p.language && (
                <span className="mt-0.5 text-[10px] text-text-tertiary">
                  {p.language}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* New button */}
      <div className="p-3">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            if (mode === "chats") {
              router.push("/chat");
            } else {
              router.push("/project/new");
            }
          }}
        >
          + New {mode === "chats" ? "Chat" : "Project"}
        </Button>
      </div>
    </div>
  );
}
