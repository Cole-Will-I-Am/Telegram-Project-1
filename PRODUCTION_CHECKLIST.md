# Production Checklist

## 1) Environment

Set these for production deployment:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_ENABLED=true`
- `TELEGRAM_BOT_GROUP_MODE=all` (or `mention`)
- `TELEGRAM_MINIAPP_URL=https://<your-miniapp-domain>`
- `TELEGRAM_DEV_AUTH=false`
- `CORS_ORIGIN=https://<your-miniapp-domain>`
- `NEXT_PUBLIC_API_URL=https://<your-api-domain>`
- `NEXT_PUBLIC_BOT_USERNAME=<your_bot_username>`
- `NEXT_PUBLIC_ENABLE_DEV_LOGIN=false`

## 2) Telegram BotFather setup

- `/setjoingroups` -> Enable
- `/setprivacy` -> Disable (required if you want all group messages)
- `/setmenubutton` -> set your Mini App URL

After changing privacy/menu settings, remove and re-add the bot to each group.

## 3) Deploy and verify

```bash
pnpm --filter server build
pnpm --filter web build
docker compose -f docker-compose.prod.yml up -d --build
```

Verify health:

- `GET /api/health` should return `{"status":"ok"}`
- `GET /api/ready` should return `{"status":"ready"}`

## 4) Smoke tests

- Mini App opens from bot menu button.
- Mini App login succeeds from Telegram.
- `/ping` works in private chat.
- In groups:
  - `/ping@<bot_username>` works.
  - Mention/reply works.
  - Plain-text group messages work when privacy is disabled and mode is `all`.
