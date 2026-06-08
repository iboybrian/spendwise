import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { Platform } from 'react-native'
import { useStore } from '@/store/useStore'

let unsubscribe: (() => void) | null = null

export function startConnectivityListener() {
  const setOnline = useStore.getState().setOnline

  const handler = (state: NetInfoState) => {
    const online = Platform.OS === 'web'
      ? (navigator as any).onLine ?? true
      : state.isConnected ?? true
    setOnline(online)
  }

  NetInfo.fetch().then(handler)
  unsubscribe = NetInfo.addEventListener(handler)
}

export function stopConnectivityListener() {
  unsubscribe?.()
  unsubscribe = null
}

export async function checkIsOnline(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return (navigator as any).onLine ?? true
  }
  const state = await NetInfo.fetch()
  return state.isConnected ?? true
}
