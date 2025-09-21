import { cookies } from 'next/headers';
import { supportedLocales, defaultLocale, type SupportedLocale } from './language';

/**
 * Get the current locale on the server side
 * This function can be used in Server Components and API routes
 */
export async function getServerLocale(): Promise<SupportedLocale> {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value as SupportedLocale;
    
    if (locale && supportedLocales.includes(locale)) {
      return locale;
    }
  } catch (error) {
    // Fallback to default if cookies are not available
    console.warn('Could not access cookies for locale detection:', error);
  }
  
  return defaultLocale;
}