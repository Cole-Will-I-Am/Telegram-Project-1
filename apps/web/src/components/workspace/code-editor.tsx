"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

interface CodeEditorProps {
  content: string;
  language?: string | null;
  readOnly?: boolean;
  onChange?: (content: string) => void;
  className?: string;
}

/**
 * Lightweight code editor with line numbers.
 * CodeMirror 6 integration is lazy-loaded to avoid SSR issues.
 */
export function CodeEditor({ content, language, readOnly = false, onChange, className }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [cmLoaded, setCmLoaded] = useState(false);
  const viewRef = useRef<any>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    let cancelled = false;

    async function loadCodeMirror() {
      try {
        const { EditorView, basicSetup } = await import("codemirror");
        const { EditorState } = await import("@codemirror/state");
        const { oneDark } = await import("@codemirror/theme-one-dark");

        if (cancelled || !editorRef.current) return;

        // Forge Code dark theme overrides
        const forgeTheme = EditorView.theme({
          "&": {
            backgroundColor: "#080809",
            color: "rgba(255,255,255,0.92)",
            fontSize: "13px",
            fontFamily: "'JetBrains Mono', monospace",
          },
          ".cm-gutters": {
            backgroundColor: "#0C0C0E",
            color: "rgba(255,255,255,0.2)",
            border: "none",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "rgba(97,122,255,0.08)",
          },
          ".cm-activeLine": {
            backgroundColor: "rgba(255,255,255,0.02)",
          },
          ".cm-cursor": {
            borderLeftColor: "#617AFF",
          },
          ".cm-selectionBackground": {
            backgroundColor: "rgba(97,122,255,0.2) !important",
          },
          ".cm-content": {
            caretColor: "#617AFF",
          },
        });

        const extensions = [
          basicSetup,
          oneDark,
          forgeTheme,
          EditorView.lineWrapping,
        ];

        if (readOnly) {
          extensions.push(EditorState.readOnly.of(true));
        }

        if (onChange) {
          extensions.push(
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                onChange(update.state.doc.toString());
              }
            }),
          );
        }

        const state = EditorState.create({
          doc: content,
          extensions,
        });

        const view = new EditorView({
          state,
          parent: editorRef.current!,
        });

        viewRef.current = view;
        setCmLoaded(true);
      } catch {
        // CodeMirror not available — fallback to textarea
      }
    }

    loadCodeMirror();

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
    };
  }, []); // Initialize once

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div className={cn("h-full overflow-auto rounded-xl border border-border-light bg-bg-primary", className)}>
      <div ref={editorRef} className="h-full" />

      {/* Fallback while loading */}
      {!cmLoaded && (
        <textarea
          value={content}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm text-text-primary outline-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}
