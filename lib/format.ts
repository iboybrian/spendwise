import i18n from './i18n'

// Latin-American Spanish formats like the rest of the region ("Q 1,234.50");
// plain 'es' would render Spain-style "1234,50 Q".
const LOCALES: Record<string, string> = { es: 'es-419', en: 'en-US', pt: 'pt-BR' }

export const appLocale = () => LOCALES[i18n.language] ?? 'en-US'

// Building an Intl formatter is the slow part; lists format hundreds of rows.
const moneyFormatters = new Map<string, Intl.NumberFormat>()

/** "Q 35.00" — narrow symbol, so GTQ isn't spelled out as "GTQ 35.00". */
export function formatMoney(amount: number, currency = 'USD'): string {
  const key = `${appLocale()}|${currency}`
  let f = moneyFormatters.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(appLocale(), { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    } catch {
      // Older Hermes Intl lacks narrowSymbol.
      f = new Intl.NumberFormat(appLocale(), { style: 'currency', currency })
    }
    moneyFormatters.set(key, f)
  }
  return f.format(amount)
}

/** "lun, 12 oct" for a local `YYYY-MM-DD` calendar day. */
export function formatDay(dateStr: string): string {
  // Noon, so no timezone can roll the calendar day over.
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(appLocale(), {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

/** Translated name for a built-in category; custom categories pass through. */
export const categoryLabel = (category: string) =>
  i18n.t(`categories.${(category || 'Other').toLowerCase()}`, { defaultValue: category })
