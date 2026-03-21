import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useStore((s) => s.session);
  const profile = useStore((s) => s.profile);
  const isInitialized = useStore((s) => s.isInitialized);
  const setSession = useStore((s) => s.setSession);
  const setProfile = useStore((s) => s.setProfile);
  const setInitialized = useStore((s) => s.setInitialized);
  const router = useRouter();
  const segments = useSegments();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      if (data) setProfile(data);
    } catch (e) {
      console.log('Profile fetch error (may not exist yet):', e);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setInitialized(true);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setInitialized(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Navigation guard
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      // Not signed in → go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (profile && !profile.onboarding_completed) {
      // Signed in but hasn't onboarded
      if (!inOnboarding) {
        router.replace('/(onboarding)');
      }
    } else if (profile && profile.onboarding_completed) {
      // Signed in and onboarded → go to tabs
      if (inAuthGroup || inOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [isInitialized, session, profile, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="weekly-summary" options={{ presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
