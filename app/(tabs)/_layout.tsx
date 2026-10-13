import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as haptics from '@/lib/haptics';
import { Home, List, User } from 'lucide-react-native';

// Swipe order, left to right. `add` is hidden from the bar, so it's not in here.
const SWIPE_ORDER = ['index', 'expenses', 'profile'] as const;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const segments: string[] = useSegments();
  const current = (segments[1] ?? 'index') as (typeof SWIPE_ORDER)[number];

  const goBy = (step: 1 | -1) => {
    const i = SWIPE_ORDER.indexOf(current);
    const next = i < 0 ? undefined : SWIPE_ORDER[i + step];
    if (!next) return;
    haptics.select();
    router.navigate(next === 'index' ? '/(tabs)' : `/(tabs)/${next}`);
  };

  // Horizontal swipe switches tabs. failOffsetY hands vertical drags back to the
  // ScrollViews so scrolling a list never flips the page.
  // ponytail: fling-to-switch, not a finger-following pager; react-native-pager-view if that's wanted.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-25, 25])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 80 && Math.abs(e.velocityX) < 600) return;
      goBy(e.translationX < 0 ? 1 : -1);
    });

  return (
    // touchAction keeps native vertical scrolling working in mobile browsers.
    <GestureDetector gesture={swipe} touchAction="pan-y">
      <View style={{ flex: 1 }}>
        <Tabs
          screenListeners={{ tabPress: haptics.select }}
          screenOptions={{
            tabBarActiveTintColor: '#4F46E5',
            headerShown: false,
            animation: 'shift',
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: t('tabs.home'),
              tabBarIcon: ({ color }) => <Home color={color} size={24} />,
            }}
          />
          <Tabs.Screen
            name="expenses"
            options={{
              title: t('tabs.expenses'),
              tabBarIcon: ({ color }) => <List color={color} size={24} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t('tabs.profile'),
              tabBarIcon: ({ color }) => <User color={color} size={24} />,
            }}
          />
          <Tabs.Screen
            name="add"
            options={{
              // We will hide this from the tab bar and navigate to it via FAB if needed
              // Or we can leave it as a modal presentation in _layout.tsx
              href: null,
            }}
          />
        </Tabs>
      </View>
    </GestureDetector>
  );
}
