import { View, Text, StyleSheet } from 'react-native'
import { useStore } from '@/store/useStore'
import { useEffect, useRef } from 'react'
import { WifiOff } from 'lucide-react-native'

export function ConnectionBanner() {
  const isOnline = useStore((s) => s.isOnline)
  const pendingChangesCount = useStore((s) => s.pendingChangesCount)
  const syncInProgress = useStore((s) => s.syncInProgress)

  const wasOffline = useRef(false)

  useEffect(() => {
    if (isOnline && wasOffline.current && pendingChangesCount > 0) {
      wasOffline.current = false
    }
    if (!isOnline) {
      wasOffline.current = true
    }
  }, [isOnline, pendingChangesCount])

  if (isOnline && !syncInProgress) return null

  return (
    <View style={[styles.banner, { backgroundColor: syncInProgress ? '#2563EB' : '#EA580C' }]}>
      <WifiOff color="#FFF" size={16} />
      <Text style={styles.text}>
        {syncInProgress
          ? 'Sincronizando...'
          : `Sin conexión${pendingChangesCount > 0 ? ` (${pendingChangesCount} cambios pendientes)` : ''}`
        }
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
})
