export const supportedLocales = ['en', 'ko', 'es', 'fr', 'zh'] as const;
export type SupportedLocale = typeof supportedLocales[number];
export const defaultLocale: SupportedLocale = 'en';

/**
 * Get the current locale on the client side
 * This function can be used in Client Components
 */
export function getClientLocale(): SupportedLocale {
  if (typeof document !== 'undefined') {
    // Check cookie first
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as SupportedLocale;
    
    if (cookieValue && supportedLocales.includes(cookieValue)) {
      return cookieValue;
    }
    
    // Fallback to localStorage
    const storedLocale = localStorage.getItem('i18nextLng') as SupportedLocale;
    if (storedLocale && supportedLocales.includes(storedLocale)) {
      return storedLocale;
    }
  }
  
  return defaultLocale;
}

/**
 * Set the locale cookie (client-side only)
 */
export function setClientLocale(locale: SupportedLocale): void {
  if (typeof document !== 'undefined' && supportedLocales.includes(locale)) {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    localStorage.setItem('i18nextLng', locale);
  }
}