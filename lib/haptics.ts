import * as Haptics from 'expo-haptics'

// Fire-and-forget. Devices without a vibration motor (and browsers without
// navigator.vibrate, like iOS Safari) reject; that must never surface as an error.
const safe = (p: Promise<void>) => { p.catch(() => {}) }

/** Button press. */
export const tap = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
/** Changing a selection: tab, filter, chart slice. */
export const select = () => safe(Haptics.selectionAsync())
/** Something was saved. */
export const success = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
/** Something was removed. */
export const warn = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
