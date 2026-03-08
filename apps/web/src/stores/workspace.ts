"use client";

import { create } from "zustand";
import type { Workspace, Project, ProjectFile } from "@forge-code/shared-types";
import { api } from "@/lib/api";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projects: Project[];
  activeProject: Project | null;
  files: ProjectFile[];
  activeFile: ProjectFile | null;

  fetchWorkspaces: () => Promise<void>;
  ensureDefaultProject: () => Promise<Project | null>;
  setActiveWorkspace: (ws: Workspace) => void;
  fetchProjects: (workspaceId: string) => Promise<void>;
  setActiveProject: (p: Project) => void;
  fetchFiles: (projectId: string) => Promise<void>;
  setActiveFile: (f: ProjectFile | null) => void;
  createProject: (workspaceId: string, data: { name: string; description?: string; language?: string }) => Promise<Project>;
  createFile: (projectId: string, data: { path: string; content: string; language?: string }) => Promise<ProjectFile>;
  updateFile: (fileId: string, content: string) => Promise<ProjectFile>;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  projects: [],
  activeProject: null,
  files: [],
  activeFile: null,

  fetchWorkspaces: async () => {
    const workspaces = await api.get<Workspace[]>("/api/workspaces");
    const active = workspaces[0] ?? null;
    set({ workspaces, activeWorkspace: active });
    if (active) {
      await get().fetchProjects(active.id);
    } else {
      set({ projects: [], activeProject: null, files: [], activeFile: null });
    }
  },

  ensureDefaultProject: async () => {
    let { activeWorkspace, projects } = get();
    if (!activeWorkspace) {
      await get().fetchWorkspaces();
      activeWorkspace = get().activeWorkspace;
      projects = get().projects;
    }
    if (!activeWorkspace) return null;

    if (projects.length > 0) return projects[0];

    const project = await get().createProject(activeWorkspace.id, {
      name: "General",
      description: "Default project for chats",
      language: "typescript",
    });
    return project;
  },

  setActiveWorkspace: (ws) => {
    set({ activeWorkspace: ws, projects: [], activeProject: null, files: [], activeFile: null });
    get().fetchProjects(ws.id);
  },

  fetchProjects: async (workspaceId) => {
    const projects = await api.get<Project[]>(`/api/workspaces/${workspaceId}/projects`);
    set({ projects });
  },

  setActiveProject: (p) => {
    set({ activeProject: p, files: [], activeFile: null });
    get().fetchFiles(p.id);
  },

  fetchFiles: async (projectId) => {
    const files = await api.get<ProjectFile[]>(`/api/projects/${projectId}/files`);
    set({ files });
  },

  setActiveFile: (f) => set({ activeFile: f }),

  createProject: async (workspaceId, data) => {
    const project = await api.post<Project>(`/api/workspaces/${workspaceId}/projects`, data);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  createFile: async (projectId, data) => {
    const file = await api.post<ProjectFile>(`/api/projects/${projectId}/files`, data);
    set((s) => ({ files: [...s.files, file] }));
    return file;
  },

  updateFile: async (fileId, content) => {
    const file = await api.patch<ProjectFile>(`/api/files/${fileId}`, { content });
    set((s) => ({
      files: s.files.map((f) => (f.id === fileId ? file : f)),
      activeFile: s.activeFile?.id === fileId ? file : s.activeFile,
    }));
    return file;
  },
}));
