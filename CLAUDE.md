# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # expo start (dev server; press a/i/w for android/ios/web)
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run lint       # expo lint (ESLint, eslint-config-expo)

node lib/dates.test.ts   # the only test file; plain node:assert, Node >=23 strips the types
```

Supabase Edge Functions deploy via `supabase functions deploy <name>`. The web build is deployed by Vercel using [vercel.json](vercel.json) (`npx expo export -p web` → `dist`, all paths rewritten to `/` for client-side routing).

## Stack

Expo SDK 54 (new architecture) + React Native 0.81 + TypeScript, Expo Router file-based routing, Zustand for state, Supabase (Postgres + Auth + Deno Edge Functions), i18next (en/es, inline resources in [lib/i18n.ts](lib/i18n.ts)). AI categorization uses Groq (Llama 3.1) via the `categorize-expense` edge function.

Env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` come from `.env`.

**Dependency footgun:** `react-native-gifted-charts` (the `PieChart` on the expenses screen) `require`s `expo-linear-gradient` at module load and throws `Gradient package was not found` if it is absent — nothing in this repo imports it directly. Before removing a dependency that source-level grep says is unused, check the `peerDependencies` of packages inside `node_modules`.

## Architecture

### Offline-first data flow (the big picture)

All reads/writes go through [lib/data.ts](lib/data.ts) — never call Supabase directly from screens for expense/recurring/profile CRUD (the recurring generator below is the one deliberate exception). Each function checks connectivity ([lib/connectivity.ts](lib/connectivity.ts)), tries Supabase when online, and on failure or offline falls back to the local store **and** queues the mutation in a pending-changes table. [lib/sync.ts](lib/sync.ts) replays the queue against Supabase; it is triggered automatically when the app comes back online (Zustand subscription in [app/_layout.tsx](app/_layout.tsx)).

IDs are generated client-side (`crypto.randomUUID()` in `lib/data.ts`) so a row created offline keeps the same identity once it syncs — don't switch inserts back to server-generated ids.

The local store is platform-split by Metro resolution:
- [lib/database.ts](lib/database.ts) — web, backed by AsyncStorage
- [lib/database.native.ts](lib/database.native.ts) — iOS/Android, backed by expo-sqlite

Both files must export the identical API (`getLocalExpenses`, `saveLocalExpense`, `addPendingChange`, etc.). Changing one requires mirroring the change in the other.

Pending-changes count and sync state live in the Zustand store ([store/useStore.ts](store/useStore.ts)) and surface in the UI via [components/connection-banner.tsx](components/connection-banner.tsx).

### Dates are calendar days, not instants

Use `toLocalDateStr` / `startOfWeek` from [lib/dates.ts](lib/dates.ts) for anything that touches an expense `date` or a weekly range. `toISOString()` serializes in UTC, so west of UTC an evening expense gets stamped with tomorrow — that bug shipped once. Home and Expenses must derive their totals from the same helpers or their numbers drift apart. [supabase/diagnose-date-shift.sql](supabase/diagnose-date-shift.sql) and [supabase/fix-date-shift.sql](supabase/fix-date-shift.sql) repair rows written before the fix.

### Recurring expenses

`recurring_expenses` rows store a **monthly** amount; deactivation is a soft toggle (`is_active`), not a delete. The daily charges are materialized **client-side** by `processRecurringExpenses` in [app/(tabs)/expenses.tsx](app/(tabs)/expenses.tsx): on each online fetch it reads which days already exist, then inserts the missing ones at `amount / daysInMonth`. This is the one place that talks to `supabase` directly instead of going through `lib/data.ts` (it only runs online).

Two overlapping runs can both see the same day as missing, so the write is an `upsert` with `onConflict: 'recurring_expense_id,date'` backed by the unique index `expenses_recurring_day_uniq`. That index must stay **non-partial** — PostgREST emits a bare `ON CONFLICT (recurring_expense_id, date)` and Postgres fails every insert with `42P10` against a partial index. Never swallow the upsert error; silent failure means recurring expenses stop being recorded with nothing on screen saying so.

### Routing & auth flow

[app/_layout.tsx](app/_layout.tsx) is the root: initializes the local DB, starts the connectivity listener, subscribes to Supabase auth state, handles deep links (Supabase email-confirmation tokens arrive as `#access_token=...` hash fragments), and enforces the navigation guard:

- no session → `(auth)` group (login/forgot-password/reset)
- session but `profile.onboarding_completed` false → `(onboarding)`
- onboarded → `(tabs)` (index=home, expenses, add, profile)

`weekly-summary` and `privacy` are modals at the root stack level.

### Supabase backend

[supabase/schema.sql](supabase/schema.sql) is the source of truth: `users`, `expenses`, `recurring_expenses`, `weekly_reports`, all with per-user RLS (`auth.uid()`). A `handle_new_user` trigger auto-creates the `users` profile row on signup — the client never inserts into `users`, only updates.

Edge functions in [supabase/functions/](supabase/functions/): `categorize-expense` (Groq categorizes a description into a fixed category list) and `weekly-summary`.

## Language / i18n

User language is persisted on the `users.language` column (default `es`). `useStore.setProfile` and `changeLanguage` keep i18n in sync with the profile; add new strings to both `en` and `es` in [lib/i18n.ts](lib/i18n.ts).

## Conventions (from .agents/rules/global.md)

- Error handling: wrap async operations in try/catch and surface user-facing failures with `Alert.alert()`.
- If a package isn't in package.json, ask before installing.
- Do not modify `.env` or `app.json` without being asked.
- Do not delete files without explicit permission.
- Styling is plain React Native StyleSheet with light/dark support (`useColorScheme` hook); primary color is deep indigo (`#4F46E5`).
