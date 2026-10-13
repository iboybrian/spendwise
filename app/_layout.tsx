import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDatabase } from '@/lib/database';
import { fetchProfile as loadProfile } from '@/lib/data';
import { startConnectivityListener, stopConnectivityListener } from '@/lib/connectivity';
import { syncPendingChanges } from '@/lib/sync';
import { ConnectionBanner } from '@/components/connection-banner';
import '@/lib/i18n';

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

  // Auth events (initial session, token refresh, app resume) can fire several
  // times in a row; one in-flight load is enough and two concurrent ones made
  // the navigation guard run on half-loaded state.
  const profileLoad = useRef<Promise<any> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (profileLoad.current) return profileLoad.current;
    // Goes through lib/data so an offline start falls back to the cached
    // profile instead of leaving the app with no profile at all.
    profileLoad.current = loadProfile(userId)
      .then((data) => {
        if (data) setProfile(data);
        return data;
      })
      .catch((e) => {
        console.log('Profile fetch error (may not exist yet):', e);
        return null;
      })
      .finally(() => {
        profileLoad.current = null;
        setInitialized(true);
      });
    return profileLoad.current;
  }, []);

  useEffect(() => {
    // Initialize local database
    initDatabase().catch(e => console.warn('DB init error:', e));

    // Start connectivity listener
    startConnectivityListener();

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        // Drain whatever a previous session left queued. The subscription below
        // only fires on an offline→online edge, so a queue built up offline and
        // then reopened while online would otherwise never replay — leaving the
        // server row stale (e.g. onboarding_completed still false).
        syncPendingChanges().catch(e => console.warn('Startup sync error:', e));
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

    return () => {
      subscription.unsubscribe();
      stopConnectivityListener();
    };
  }, []);

  // Sync pending changes when coming back online
  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      if (state.isOnline && !prev.isOnline) {
        syncPendingChanges().catch(e => console.warn('Sync on reconnect error:', e))
      }
    })
    return unsub
  }, [])

  // Deep link handler for Supabase email confirmation & magic links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      try {
        // Supabase appends tokens as hash fragments: #access_token=...&refresh_token=...
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return;

        const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session — this triggers onAuthStateChange above,
          // which updates Zustand and the navigation guard redirects automatically
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('Deep link session error:', error.message);
          }
        }
      } catch (e) {
        console.error('Deep link handling error:', e);
      }
    };

    // Handle the URL that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Handle URLs while the app is already open (warm start)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  // Navigation guard. `router.replace` is async, so the redirect target is
  // computed first and remembered: firing the same replace twice before
  // `segments` catches up interrupts the stack transition, which on web leaves
  // the incoming screen parked at a half-applied translate (the onboarding
  // screen showing up shifted sideways).
  const lastRedirect = useRef<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    let target: string | null = null;
    if (!session) {
      if (!inAuthGroup) target = '/(auth)/login';
    } else if (!profile) {
      // Signed in, profile still loading — stay put rather than guess.
    } else if (!profile.onboarding_completed) {
      if (!inOnboarding) target = '/(onboarding)';
    } else if (inAuthGroup || inOnboarding) {
      target = '/(tabs)';
    }

    if (!target) {
      lastRedirect.current = null;
      return;
    }
    if (lastRedirect.current === target) return;
    lastRedirect.current = target;
    router.replace(target as any);
  }, [isInitialized, session, profile, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ConnectionBanner />
      <Stack screenOptions={{ headerShown: false, animation: Platform.OS === 'web' ? 'none' : 'default' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="weekly-summary" options={{ presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
