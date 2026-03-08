"use client";

import { useState } from "react";
import { FileTree } from "./file-tree";
import { CodeEditor } from "./code-editor";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useWorkspaceStore } from "@/stores/workspace";
import { useUIStore } from "@/stores/ui";
import { cn } from "@/components/ui/cn";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface WorkspaceViewProps {
  projectId: string;
  threadId?: string;
}

export function WorkspaceView({ projectId, threadId }: WorkspaceViewProps) {
  const { files, activeFile, setActiveFile } = useWorkspaceStore();
  const { chatPanelOpen, toggleChatPanel } = useUIStore();
  const [fileTreeWidth] = useState(220);

  return (
    <div className="flex h-full">
      {/* File tree panel */}
      <div
        className="flex flex-col border-r border-border bg-bg-secondary"
        style={{ width: fileTreeWidth }}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <Label>Files</Label>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FileTree
            files={files}
            selectedId={activeFile?.id}
            onSelect={setActiveFile}
          />
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex flex-1 flex-col">
        {/* Tab bar */}
        {activeFile && (
          <div className="flex items-center border-b border-border bg-bg-secondary px-2">
            <div className="flex items-center gap-2 rounded-t-lg bg-bg-primary px-3 py-1.5">
              <span className="text-xs text-text-primary">{activeFile.path.split("/").pop()}</span>
              <button
                onClick={() => setActiveFile(null)}
                className="text-text-tertiary hover:text-text-secondary"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M1.5 1.5l7 7m-7 0l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>
            <div className="ml-auto pr-2">
              <Button variant="ghost" size="sm" onClick={toggleChatPanel}>
                {chatPanelOpen ? "Hide Chat" : "Show Chat"}
              </Button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1">
          {activeFile ? (
            <CodeEditor
              content={activeFile.content}
              language={activeFile.language}
              readOnly={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-tertiary">Select a file to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel (collapsible) */}
      {chatPanelOpen && threadId && (
        <div className="w-[360px] border-l border-border">
          <ChatPanel threadId={threadId} />
        </div>
      )}
    </div>
  );
}
