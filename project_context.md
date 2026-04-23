# SpendWise Project Architecture & Context

## Project Overview
**Name**: SpendWise
**Type**: React Native Mobile Application
**Framework**: Expo (SDK 54 approx, new architecture enabled)
**Routing**: Expo Router (file-based routing)

## Tech Stack & Libraries
- **UI/Framework**: React Native (0.81.5), React (19.1.0)
- **State Management**: Zustand
- **Backend/Database**: Supabase
- **Navigation**: React Navigation (under the hood of Expo Router)
- **Styling/Animations**: React Native Reanimated, Moti
- **Charts**: React Native Gifted Charts
- **Icons**: Lucide React Native, Expo Vector Icons
- **Storage**: AsyncStorage
- **Localization**: i18next, react-i18next

## Configuration Highlights
- **App.json**: Slug `SpendWise`, scheme `spendwise`. Supports Android predictive back gestures and edge-to-edge. Adaptive icon and custom splash screen.
- **TypeScript**: Yes, enabled and used heavily.
- **Styling**: Standard React Native StyleSheet or inline styling, along with custom fonts loaded via Expo.
