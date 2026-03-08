"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrate } = useAuthStore();
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);

  useEffect(() => {
    hydrate();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchWorkspaces();
  }, [token, hydrate, router, fetchWorkspaces]);

  if (!token) return null;

  return <AppShell>{children}</AppShell>;
}
