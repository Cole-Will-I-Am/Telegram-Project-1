"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { useChatStore } from "@/stores/chat";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated, hydrate } = useAuthStore();
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);
  const fetchThreads = useChatStore((s) => s.fetchThreads);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      await fetchWorkspaces();
      const firstProject = useWorkspaceStore.getState().projects[0];
      if (firstProject) {
        await fetchThreads(firstProject.id);
      }
    };
    void init();
  }, [token, hydrated, router, fetchWorkspaces, fetchThreads]);

  if (!hydrated || !token) return null;

  return <AppShell>{children}</AppShell>;
}
