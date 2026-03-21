import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import i18n from '@/lib/i18n'

export interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    salary?: number;
    weekly_budget?: number;
    currency: string;
    language: string;
    onboarding_completed: boolean;
}

interface UserState {
    session: Session | null;
    profile: UserProfile | null;
    isInitialized: boolean;
    setSession: (session: Session | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setInitialized: (initialized: boolean) => void;
    clearSession: () => void;
    changeLanguage: (lang: string) => Promise<void>;
}

export const useStore = create<UserState>((set, get) => ({
    session: null,
    profile: null,
    isInitialized: false,
    setSession: (session) => set({ session }),
    setProfile: (profile) => {
        set({ profile });
        // Sync i18n language whenever the profile is loaded/updated
        if (profile?.language && i18n.language !== profile.language) {
            i18n.changeLanguage(profile.language);
        }
    },
    setInitialized: (isInitialized) => set({ isInitialized }),
    clearSession: () => set({ session: null, profile: null }),
    changeLanguage: async (lang: string) => {
        const { profile } = get();
        // 1. Instantly swap the i18n dictionary
        i18n.changeLanguage(lang);
        // 2. Optimistically update Zustand so UI re-renders immediately
        if (profile) {
            set({ profile: { ...profile, language: lang } });
        }
        // 3. Persist to Supabase
        if (profile?.id) {
            await supabase
                .from('users')
                .update({ language: lang })
                .eq('id', profile.id);
        }
    },
}))
