import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

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
}

export const useStore = create<UserState>((set) => ({
    session: null,
    profile: null,
    isInitialized: false,
    setSession: (session) => set({ session }),
    setProfile: (profile) => set({ profile }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    clearSession: () => set({ session: null, profile: null }),
}))
