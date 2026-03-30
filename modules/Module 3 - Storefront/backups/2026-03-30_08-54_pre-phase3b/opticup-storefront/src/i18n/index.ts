import he from './he.json';
import en from './en.json';
import ru from './ru.json';

const translations: Record<string, typeof he> = { he, en, ru };

export type Locale = 'he' | 'en' | 'ru';

export const defaultLocale: Locale = 'he';
export const locales: Locale[] = ['he', 'en', 'ru'];

export function t(locale: Locale, key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[locale] ?? translations[defaultLocale];
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof result === 'string' ? result : key;
}

export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

export function getLangName(locale: Locale): string {
  const names: Record<Locale, string> = {
    he: 'עברית',
    en: 'English',
    ru: 'Русский'
  };
  return names[locale];
}
