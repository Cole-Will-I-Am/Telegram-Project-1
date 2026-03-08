"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { getInitData, initTelegram, isTelegramEnvironment } from "@/lib/telegram";

type BootState = "checking" | "authenticating" | "telegram-missing-init" | "browser";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, token } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [bootState, setBootState] = useState<BootState>("checking");

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "manticode_bot";
  const miniAppLink = `https://t.me/${botUsername}?startapp=1`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const apiLooksLocal = /localhost|127\.0\.0\.1/.test(apiUrl);
  const devLoginEnabled = (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN || "false").toLowerCase() === "true";

  useEffect(() => {
    if (token) {
      router.replace("/chat");
      return;
    }

    let mounted = true;

    initTelegram().then(() => {
      if (!mounted) return;
      if (!isTelegramEnvironment()) {
        setBootState("browser");
        return;
      }

      const initData = getInitData();
      if (!initData) {
        setBootState("telegram-missing-init");
        return;
      }

      setBootState("authenticating");
      login(initData)
        .then(() => router.replace("/chat"))
        .catch((e) => {
          setError(e.message);
          setBootState("telegram-missing-init");
        });
    });

    return () => {
      mounted = false;
    };
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

      {(loading || bootState === "checking" || bootState === "authenticating") ? (
        <p className="text-sm text-text-secondary">Authenticating...</p>
      ) : bootState === "browser" ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-text-tertiary">
            Open in Telegram for automatic login
          </p>
          {devLoginEnabled && (
            <Button variant="secondary" size="sm" onClick={handleDevLogin}>
              Dev Login
            </Button>
          )}
        </div>
      ) : (
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <p className="text-xs text-text-tertiary">
            Open this app from @{botUsername} via the bot menu button or startapp link.
          </p>
          {apiLooksLocal && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
              This build points to {apiUrl}. Telegram clients cannot reach localhost APIs.
            </p>
          )}
          <a
            href={miniAppLink}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-accent-gradient px-3 text-xs font-medium text-white shadow-lg shadow-accent/20"
          >
            Open Mini App
          </a>
        </div>
      )}
    </div>
  );
}
