# SpendWise

Offline-first expense tracker. Expo / React Native + Supabase, with AI expense categorization (Groq via Supabase Edge Functions).

## Setup

```bash
npm install
npx expo start
```

Requires `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Database schema lives in `supabase/schema.sql`.
