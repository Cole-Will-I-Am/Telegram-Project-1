"use client";

import {
  init,
  miniApp,
  viewport,
  themeParams,
  initData,
  type User as TGUser,
} from "@telegram-apps/sdk-react";

const SEER_BG = "#080809";

export async function initTelegram() {
  try {
    init();

    // Expand viewport to full height
    if (viewport.mount.isAvailable()) {
      await viewport.mount();
      if (viewport.expand.isAvailable()) {
        viewport.expand();
      }
    }

    // Set Seer-dark header and background
    if (miniApp.setHeaderColor.isAvailable()) {
      miniApp.setHeaderColor(SEER_BG);
    }
    if (miniApp.setBackgroundColor.isAvailable()) {
      miniApp.setBackgroundColor(SEER_BG);
    }
  } catch {
    // Running outside Telegram — dev mode
    console.warn("Telegram SDK init failed — running in browser mode");
  }
}

export function getInitData(): string | null {
  try {
    return initData.raw() ?? null;
  } catch {
    return null;
  }
}

export function getTelegramUser(): TGUser | null {
  try {
    const user = initData.user();
    return user ?? null;
  } catch {
    return null;
  }
}

export function isTelegramEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("tgWebAppData") ||
    navigator.userAgent.includes("TelegramBot") ||
    !!getInitData();
}
