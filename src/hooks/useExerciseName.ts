import { useSettingsStore } from '../stores/settings.store';
import { getExerciseName, getCanonicalName } from '../i18n/exerciseNames';

export function useExerciseName() {
  const language = useSettingsStore((s) => s.language);
  return {
    exName: (name: string) => getExerciseName(name, language),
    canonical: (localName: string) => getCanonicalName(localName, language),
  };
}
