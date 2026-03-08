"use client";

import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  chatPanelOpen: boolean;

  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  toggleChatPanel: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  activeModal: null,
  chatPanelOpen: true,

  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
}));
