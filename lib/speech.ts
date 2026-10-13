/**
 * Voice dictation for expenses.
 *
 * Uses the browser's Web Speech API, so it works in the web/PWA build (Chrome,
 * Android, Safari 14.5+). iOS/Android native have no built-in speech-to-text
 * without a dev-build module, so there `canDictate` is false and the mic button
 * stays hidden.
 * ponytail: web-only; add expo-speech-recognition (needs a dev build) for native.
 */

const Recognition: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined

export const canDictate = !!Recognition

/** Recognizer locale for the app language, preferring the device's regional variant. */
export function speechLang(appLang: string): string {
  const device = typeof navigator !== 'undefined' ? (navigator as any).language : undefined
  if (device?.startsWith(appLang)) return device
  return appLang === 'en' ? 'en-US' : 'es-MX'
}

/** Listens for one utterance. Resolves '' if the user said nothing. */
export function listen(lang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new Recognition()
    r.lang = lang
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e: any) => resolve(e.results[0][0].transcript)
    r.onerror = (e: any) => (e.error === 'no-speech' ? resolve('') : reject(new Error(e.error)))
    r.onend = () => resolve('') // no-op if onresult already resolved
    r.start()
  })
}

/**
 * First amount in a transcript: "35", "35.50", "35,50", "1,200" / "1.200" (thousands).
 * Offline fallback only — online, the categorize-expense function extracts the
 * amount and also understands spelled-out numbers ("treinta y cinco").
 */
export function parseAmount(text: string): number | null {
  const m = text
    .replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1')
    .match(/\d+(?:[.,]\d{1,2})?/)
  return m ? parseFloat(m[0].replace(',', '.')) : null
}
