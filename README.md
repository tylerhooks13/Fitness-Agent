# Fitness Agent (scaffold)

## Hosting recommendation
- Use Vercel serverless functions for SMS + cron endpoints (matches `vercel.json`), keep Express in `src/index.ts` only for local dev via `npm run dev`.
- Cron jobs are defined in `vercel.json` and point to `src/api/cron/*` handlers; SMS webhook is `/api/sms/webhook` → `src/api/sms-webhook.ts`.

## Current roadmap
- ✅ Scaffolded shared infra: `src/config/env.ts`, `src/utils/logger.ts`, `src/utils/date-helpers.ts`, `src/types/index.ts`.
- ✅ Notion hydration persistence wrapper: `recordHydrationIntake`, `getTodayHydrationTotal` in `src/integrations/notion.ts`.
- ✅ Twilio SMS webhook stub: `src/api/sms-webhook.ts` (logs hydration numbers, simple commands).
- ✅ Cron stubs: `src/api/cron/daily-briefing.ts`, `src/api/cron/hydration-reminder.ts`.
- 🔜 Wire Twilio client + message sending from cron handlers.
- 🔜 Flesh out Notion workout/recovery queries and prediction services.
- 🔜 Add tests for hydration logging + timezone helpers.

## Notion hydration database (daily model)
- One row per day (CST). Suggested properties:
- `Date` — Date (day-level).
- `Total (oz)` — Number (running total for the day).
- `Goal (oz)` — Number (e.g., 120).
- `Remaining (oz)` — Formula (optional): `max(prop("Goal (oz)") - prop("Total (oz)"), 0)`.
- `Status` — Select (optional): `In Progress`, `Complete`.

## Local development
```bash
npm install
npm run dev
# Health check
curl http://localhost:3000/health
```

## Environment
- Required: `NOTION_API_KEY`
- Hydration logging: `NOTION_HYDRATION_DATABASE_ID`
- Hydration goal: `HYDRATION_DAILY_GOAL_OZ` (defaults to 120)
- Twilio SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `USER_PHONE_NUMBER`
- Timezone defaults to `America/Chicago` (CST); override with `USER_TIMEZONE`.
