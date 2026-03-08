import { createHmac } from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MAX_AGE_SECONDS = 300; // 5 minutes
const DEV_AUTH_ENABLED = (process.env.TELEGRAM_DEV_AUTH || "false").toLowerCase() === "true";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface ValidatedTelegramData {
  user: TelegramUser;
  authDate: number;
}

export function validateInitData(initData: string): ValidatedTelegramData {
  // Dev mode bypass
  if (initData === "dev-mode") {
    if (!DEV_AUTH_ENABLED) {
      throw new Error("Dev mode auth is disabled");
    }
    return {
      user: {
        id: 999999,
        first_name: "Dev",
        username: "devuser",
      },
      authDate: Math.floor(Date.now() / 1000),
    };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing hash in initData");

  // Build data check string (alphabetically sorted, excluding hash)
  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  // HMAC-SHA256: secret = HMAC("WebAppData", bot_token)
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const computed = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (computed !== hash) {
    throw new Error("Invalid initData signature");
  }

  // Check freshness
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AGE_SECONDS) {
    throw new Error("initData expired");
  }

  // Parse user
  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Missing user in initData");

  const user: TelegramUser = JSON.parse(userRaw);
  return { user, authDate };
}
