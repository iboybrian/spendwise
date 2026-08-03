# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # expo start (dev server; press a/i/w for android/ios/web)
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run lint       # expo lint (ESLint, eslint-config-expo)
```

No test suite exists. Supabase Edge Functions deploy via `supabase functions deploy <name>`.

## Stack

Expo SDK 54 (new architecture) + React Native 0.81 + TypeScript, Expo Router file-based routing, Zustand for state, Supabase (Postgres + Auth + Deno Edge Functions), i18next (en/es, inline resources in [lib/i18n.ts](lib/i18n.ts)). AI categorization uses Groq (Llama 3.1) via the `categorize-expense` edge function.

Env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` come from `.env`.

**Dependency footgun:** `react-native-gifted-charts` (the `PieChart` on the expenses screen) `require`s `expo-linear-gradient` at module load and throws `Gradient package was not found` if it is absent — nothing in this repo imports it directly. Before removing a dependency that source-level grep says is unused, check the `peerDependencies` of packages inside `node_modules`.

## Architecture

### Offline-first data flow (the big picture)

All reads/writes go through [lib/data.ts](lib/data.ts) — never call Supabase directly from screens for expense/recurring/profile CRUD. Each function checks connectivity ([lib/connectivity.ts](lib/connectivity.ts)), tries Supabase when online, and on failure or offline falls back to the local store **and** queues the mutation in a pending-changes table. [lib/sync.ts](lib/sync.ts) replays the queue against Supabase; it is triggered automatically when the app comes back online (Zustand subscription in [app/_layout.tsx](app/_layout.tsx)).

The local store is platform-split by Metro resolution:
- [lib/database.ts](lib/database.ts) — web, backed by AsyncStorage
- [lib/database.native.ts](lib/database.native.ts) — iOS/Android, backed by expo-sqlite

Both files must export the identical API (`getLocalExpenses`, `saveLocalExpense`, `addPendingChange`, etc.). Changing one requires mirroring the change in the other.

Pending-changes count and sync state live in the Zustand store ([store/useStore.ts](store/useStore.ts)) and surface in the UI via [components/connection-banner.tsx](components/connection-banner.tsx).

### Routing & auth flow

[app/_layout.tsx](app/_layout.tsx) is the root: initializes the local DB, starts the connectivity listener, subscribes to Supabase auth state, handles deep links (Supabase email-confirmation tokens arrive as `#access_token=...` hash fragments), and enforces the navigation guard:

- no session → `(auth)` group (login/forgot-password/reset)
- session but `profile.onboarding_completed` false → `(onboarding)`
- onboarded → `(tabs)` (index=home, expenses, add, profile)

`weekly-summary` and `privacy` are modals at the root stack level.

### Supabase backend

[supabase/schema.sql](supabase/schema.sql) is the source of truth: `users`, `expenses`, `recurring_expenses`, `weekly_reports`, all with per-user RLS (`auth.uid()`). A `handle_new_user` trigger auto-creates the `users` profile row on signup — the client never inserts into `users`, only updates. `recurring_expenses` are monthly amounts; deactivation is a soft toggle (`is_active`), not a delete.

Edge functions in [supabase/functions/](supabase/functions/): `categorize-expense` (Groq categorizes a description into a fixed category list) and `weekly-summary`.

### Language / i18n

User language is persisted on the `users.language` column (default `es`). `useStore.setProfile` and `changeLanguage` keep i18n in sync with the profile; add new strings to both `en` and `es` in [lib/i18n.ts](lib/i18n.ts).

## Conventions (from .agents/rules/global.md)

- Error handling: wrap async operations in try/catch and surface user-facing failures with `Alert.alert()`.
- If a package isn't in package.json, ask before installing.
- Do not modify `.env` or `app.json` without being asked.
- Do not delete files without explicit permission.
- Styling is plain React Native StyleSheet with light/dark support (`useColorScheme` hook); primary color is deep indigo (`#4F46E5`).
