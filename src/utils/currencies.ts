// Common currencies with their symbols and names
export const CURRENCIES = [
  { code: 'ARS', symbol: '$', name: 'Peso argentino' },
  { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  { code: 'COP', symbol: '$', name: 'Peso colombiano' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
  { code: 'CRC', symbol: '₡', name: 'Colón costarricense' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal guatemalteco' },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileño' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno' },
  { code: 'UYU', symbol: '$', name: 'Peso uruguayo' },
  { code: 'BOB', symbol: 'Bs.', name: 'Boliviano boliviano' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní paraguayo' },
  { code: 'VES', symbol: 'Bs.', name: 'Bolívar venezolano' },
  { code: 'CAD', symbol: 'C$', name: 'Dólar canadiense' },
  { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco suizo' },
  { code: 'JPY', symbol: '¥', name: 'Yen japonés' },
  { code: 'CNY', symbol: '¥', name: 'Yuan chino' },
  { code: 'INR', symbol: '₹', name: 'Rupia india' },
  { code: 'KRW', symbol: '₩', name: 'Won surcoreano' },
  { code: 'SGD', symbol: 'S$', name: 'Dólar singapurense' },
  { code: 'HKD', symbol: 'HK$', name: 'Dólar de Hong Kong' },
  { code: 'AUD', symbol: 'A$', name: 'Dólar australiano' },
  { code: 'NZD', symbol: 'NZ$', name: 'Dólar neozelandés' },
  { code: 'ZAR', symbol: 'R', name: 'Rand sudafricano' },
  { code: 'SEK', symbol: 'kr', name: 'Corona sueca' },
  { code: 'NOK', symbol: 'kr', name: 'Corona noruega' },
  { code: 'DKK', symbol: 'kr', name: 'Corona danesa' },
  { code: 'PLN', symbol: 'zł', name: 'Złoty polaco' },
  { code: 'CZK', symbol: 'Kč', name: 'Corona checa' },
  { code: 'HUF', symbol: 'Ft', name: 'Forinto húngaro' },
  { code: 'RUB', symbol: '₽', name: 'Rublo ruso' },
  { code: 'THB', symbol: '฿', name: 'Baht tailandés' },
  { code: 'MYR', symbol: 'RM', name: 'Ringgit malayo' },
  { code: 'IDR', symbol: 'Rp', name: 'Rupia indonesia' },
  { code: 'PHP', symbol: '₱', name: 'Peso filipino' },
  { code: 'VND', symbol: '₫', name: 'Dong vietnamita' },
  { code: 'TWD', symbol: 'NT$', name: 'Nuevo dólar taiwanés' },
  { code: 'SAR', symbol: 'ر.س', name: 'Riyal saudí' },
  { code: 'AED', symbol: 'د.إ', name: 'Dírham de los EAU' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Riyal catarí' },
  { code: 'KWD', symbol: 'د.ك', name: 'Dinar kuwaití' },
  { code: 'BHD', symbol: 'ب.د', name: 'Dinar bahreiní' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Rial omaní' },
  { code: 'JOD', symbol: 'د.ا', name: 'Dinar jordano' },
  { code: 'ILS', symbol: '₪', name: 'Nuevo séquel israelí' },
  { code: 'TRY', symbol: '₺', name: 'Lira turca' },
  { code: 'EGP', symbol: 'ج.م', name: 'Libra egipcia' }
] as const

export type CurrencyCode = typeof CURRENCIES[number]['code']

// Get currency symbol by code
export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find(c => c.code === code)
  return currency?.symbol || code
}

// Get currency name by code
export function getCurrencyName(code: string): string {
  const currency = CURRENCIES.find(c => c.code === code)
  return currency?.name || code
}

// Format amount with currency
export function formatCurrency(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency)
  
  // Use appropriate locale for formatting
  const locale = getLocaleForCurrency(currency)
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    // Fallback formatting if currency is not supported by Intl.NumberFormat
    return `${symbol}${amount.toFixed(2)}`
  }
}

// Get appropriate locale for currency formatting
function getLocaleForCurrency(currency: string): string {
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'es-ES',
    'MXN': 'es-MX',
    'COP': 'es-CO',
    'ARS': 'es-AR',
    'PEN': 'es-PE',
    'CRC': 'es-CR',
    'GTQ': 'es-GT',
    'BRL': 'pt-BR',
    'CLP': 'es-CL',
    'UYU': 'es-UY',
    'BOB': 'es-BO',
    'PYG': 'es-PY',
    'VES': 'es-VE',
    'CAD': 'en-CA',
    'GBP': 'en-GB',
    'CHF': 'de-CH',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'INR': 'hi-IN',
    'KRW': 'ko-KR',
    'SGD': 'en-SG',
    'HKD': 'zh-HK',
    'AUD': 'en-AU',
    'NZD': 'en-NZ',
    'ZAR': 'en-ZA',
    'SEK': 'sv-SE',
    'NOK': 'nb-NO',
    'DKK': 'da-DK',
    'PLN': 'pl-PL',
    'CZK': 'cs-CZ',
    'HUF': 'hu-HU',
    'RUB': 'ru-RU',
    'THB': 'th-TH',
    'MYR': 'ms-MY',
    'IDR': 'id-ID',
    'PHP': 'en-PH',
    'VND': 'vi-VN',
    'TWD': 'zh-TW',
    'SAR': 'ar-SA',
    'AED': 'ar-AE',
    'QAR': 'ar-QA',
    'KWD': 'ar-KW',
    'BHD': 'ar-BH',
    'OMR': 'ar-OM',
    'JOD': 'ar-JO',
    'ILS': 'he-IL',
    'TRY': 'tr-TR',
    'EGP': 'ar-EG'
  }
  
  return localeMap[currency] || 'en-US'
}

// Get most commonly used currencies (for dropdown)
export const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'MXN', 'COP', 'ARS', 'PEN', 'BRL', 'CLP', 'CAD', 'GBP'
] as const

// Default currency
export const DEFAULT_CURRENCY = 'ARS' 