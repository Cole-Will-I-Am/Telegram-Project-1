"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthResponse } from "@forge-code/shared-types";
import { api } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  login: (initData: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      hydrated: false,

      login: async (initData: string) => {
        set({ loading: true });
        try {
          const res = await api.post<AuthResponse>("/api/auth/telegram", {
            initData,
          });
          api.setToken(res.token);
          set({ token: res.token, user: res.user, loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      logout: () => {
        api.setToken(null);
        set({ token: null, user: null });
      },

      hydrate: () => {
        const { token } = get();
        if (token) api.setToken(token);
        set({ hydrated: true });
      },
    }),
    {
      name: "forge-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);
