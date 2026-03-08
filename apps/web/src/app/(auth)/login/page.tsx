"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { getInitData, initTelegram, isTelegramEnvironment } from "@/lib/telegram";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, token } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      router.replace("/chat");
      return;
    }

    initTelegram().then(() => {
      const initData = getInitData();
      if (initData) {
        login(initData)
          .then(() => router.replace("/chat"))
          .catch((e) => setError(e.message));
      }
    });
  }, [token, login, router]);

  const handleDevLogin = async () => {
    try {
      await login("dev-mode");
      router.replace("/chat");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-bg-primary p-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="bg-accent-gradient bg-clip-text text-3xl font-bold text-transparent">
          Forge Code
        </h1>
        <p className="text-sm text-text-secondary">AI coding assistant</p>
      </div>

      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-secondary">Authenticating...</p>
      ) : !isTelegramEnvironment() ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-text-tertiary">
            Open in Telegram for automatic login
          </p>
          <Button variant="secondary" size="sm" onClick={handleDevLogin}>
            Dev Login
          </Button>
        </div>
      ) : null}
    </div>
  );
}
