import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from '@/locales/en/common.json';
import koCommon from '@/locales/ko/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  ko: {
    common: koCommon,
  },
  es: {
    common: enCommon, // Default to English for now
  },
  fr: {
    common: enCommon, // Default to English for now
  },
  zh: {
    common: enCommon, // Default to English for now
  },
};

// Custom cookie detection plugin for Next.js App Router
const cookiePlugin = {
  type: 'languageDetector' as const,
  async: false,
  init: () => {},
  detect: () => {
    if (typeof document !== 'undefined') {
      // Check for the NEXT_LOCALE cookie set by middleware
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1];
      
      if (cookieValue) {
        return cookieValue;
      }
    }
    return undefined;
  },
  cacheUserLanguage: (lng: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${lng}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

i18n
  .use(cookiePlugin)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;