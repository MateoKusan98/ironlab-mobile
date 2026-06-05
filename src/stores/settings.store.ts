import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { type LanguageCode } from '../i18n';

const STORAGE_KEY = '@ironlab_settings';

interface SettingsState {
  compoundRestSecs: number;
  isolationRestSecs: number;
  language: LanguageCode;
  loaded: boolean;
  setCompoundRestSecs: (v: number) => void;
  setIsolationRestSecs: (v: number) => void;
  setLanguage: (lang: LanguageCode) => void;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  compoundRestSecs: 180,
  isolationRestSecs: 90,
  language: 'en',
  loaded: false,

  setCompoundRestSecs: (v) => {
    set({ compoundRestSecs: v });
    persist(get);
  },

  setIsolationRestSecs: (v) => {
    set({ isolationRestSecs: v });
    persist(get);
  },

  setLanguage: (lang) => {
    set({ language: lang });
    i18n.changeLanguage(lang);
    persist(get);
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const lang: LanguageCode = parsed.language ?? 'en';
        set({
          compoundRestSecs: parsed.compoundRestSecs ?? 180,
          isolationRestSecs: parsed.isolationRestSecs ?? 90,
          language: lang,
        });
        i18n.changeLanguage(lang);
      }
    } catch {}
    set({ loaded: true });
  },
}));

function persist(get: () => SettingsState) {
  const { compoundRestSecs, isolationRestSecs, language } = get();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ compoundRestSecs, isolationRestSecs, language })).catch(() => {});
}
