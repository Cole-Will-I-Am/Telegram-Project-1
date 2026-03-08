"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace";
import { EmptyState } from "@/components/layout/empty-state";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, setActiveProject, activeProject, fetchFiles } = useWorkspaceStore();

  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setActiveProject(project);
    }
  }, [projectId, projects, setActiveProject]);

  if (!activeProject) {
    return (
      <EmptyState
        title="Project not found"
        description="Select a project from the sidebar."
        className="h-full"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">{activeProject.name}</h2>
        {activeProject.language && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] tracking-label text-accent">
            {activeProject.language}
          </span>
        )}
      </header>
      <div className="flex-1 overflow-auto p-4">
        <EmptyState
          title="Workspace view"
          description="File tree, editor, and chat panel will appear here."
          className="h-full"
        />
      </div>
    </div>
  );
}
