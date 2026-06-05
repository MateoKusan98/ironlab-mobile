import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import bs from './bs.json';
import sr from './sr.json';
import hr from './hr.json';
import cnr from './cnr.json';
import sl from './sl.json';
import mk from './mk.json';
import sq from './sq.json';

export const LANGUAGE_LOCALES: Record<string, string> = {
  en: 'en-US', bs: 'hr', sr: 'sr', hr: 'hr',
  cnr: 'sr', sl: 'sl', mk: 'mk', sq: 'sq',
};

export const safeLocaleDateString = (
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return date.toLocaleDateString('en-US', options);
  }
};

export const LANGUAGES = [
  { code: 'en',  label: 'English',       flag: '🇬🇧', aiName: 'English' },
  { code: 'bs',  label: 'Bosanski',      flag: '🇧🇦', aiName: 'Bosnian' },
  { code: 'sr',  label: 'Srpski',        flag: '🇷🇸', aiName: 'Serbian' },
  { code: 'hr',  label: 'Hrvatski',      flag: '🇭🇷', aiName: 'Croatian' },
  { code: 'cnr', label: 'Crnogorski',    flag: '🇲🇪', aiName: 'Montenegrin' },
  { code: 'sl',  label: 'Slovenščina',   flag: '🇸🇮', aiName: 'Slovenian' },
  { code: 'mk',  label: 'Македонски',    flag: '🇲🇰', aiName: 'Macedonian' },
  { code: 'sq',  label: 'Shqip',         flag: '🇦🇱', aiName: 'Albanian' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

i18n.use(initReactI18next).init({
  resources: {
    en:  { translation: en },
    bs:  { translation: bs },
    sr:  { translation: sr },
    hr:  { translation: hr },
    cnr: { translation: cnr },
    sl:  { translation: sl },
    mk:  { translation: mk },
    sq:  { translation: sq },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
