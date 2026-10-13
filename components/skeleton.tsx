import { View, StyleSheet, type ViewStyle } from 'react-native'
import { MotiView } from 'moti'
import { useReducedMotion } from 'react-native-reanimated'

/** Placeholder block that pulses while the first load is in flight. */
export function Skeleton({ style, color }: { style?: ViewStyle; color: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: reduceMotion ? 0.5 : 1 }}
      transition={{ type: 'timing', duration: 700, loop: !reduceMotion }}
      style={[{ backgroundColor: color, borderRadius: 16 }, style]}
    />
  )
}

/** Stand-in for an expense list: icon square + two text lines + amount. */
export function SkeletonRows({ count = 3, color, rowColor }: { count?: number; color: string; rowColor: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.row, { backgroundColor: rowColor }]}>
          <Skeleton color={color} style={styles.icon} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton color={color} style={{ height: 14, width: '60%', borderRadius: 7 }} />
            <Skeleton color={color} style={{ height: 12, width: '35%', borderRadius: 6 }} />
          </View>
          <Skeleton color={color} style={{ height: 16, width: 64, borderRadius: 8 }} />
        </View>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 20, marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 16 },
})
