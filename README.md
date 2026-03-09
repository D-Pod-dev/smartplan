# SmartPlan — AI-powered To‑Do

SmartPlan is a lightweight, AI-assisted to‑do app. It focuses on a simple daily flow and an assistant chat that helps prioritize, schedule, and summarize tasks (no automation flows required).

## Screens

- Today: Status cards and a focus list
- SmartPlan Chat: Conversation UI with a composer
- Insights: Lightweight metrics (flow, focus, time saved)
- Settings: Preferences and integrations placeholders

## Development

```bash
npm run dev
```

Open the app and navigate via the sidebar. Routing is powered by `react-router-dom`.

## Build

```bash
npm run build
npm run preview
```

## Tech

- React + Vite
- Client-side routing (`react-router-dom`)
- Custom CSS (no Tailwind used in UI yet)

## Changelog

- 2026-03-08: Supabase insights schema updated (`user_insights` now includes `last_completion_date`, `total_tasks_created`, and `ai_assisted_tasks`).
- For existing projects, run the migration in [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md).
