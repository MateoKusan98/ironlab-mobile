import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { WhatsNewModal } from '../components/WhatsNewModal';
import {
  CHANGELOG,
  ChangelogEntry,
  entriesNewerThan,
  compareVersions,
} from '../data/changelog';

interface WhatsNewValue {
  /** Manually show the full changelog (e.g. from a "What's New" row in Profile). */
  open: () => void;
}

const WhatsNewContext = createContext<WhatsNewValue>({ open: () => {} });

export const useWhatsNew = () => useContext(WhatsNewContext);

// Device-wide (not per-user): "what's new" is about the app build, and the
// changelog ships inside it.
const SEEN_KEY = 'whatsNewSeenVersion';

const CURRENT_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Owns the "What's New" modal app-wide.
 *
 * On launch it compares the running app version against the last version the
 * user dismissed (persisted on device) and pops the modal with every newer
 * changelog entry. A fresh install is seeded silently — new users have nothing
 * to catch up on — so the modal only ever appears after a genuine update.
 * Living above the navigator keeps it visible across screen changes.
 */
export const WhatsNewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);

  const markSeen = useCallback(() => {
    AsyncStorage.setItem(SEEN_KEY, CURRENT_VERSION).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SEEN_KEY).then((seen) => {
      if (cancelled) return;

      // First run on this device: adopt the current version without showing
      // anything, so existing users aren't spammed when this feature ships and
      // brand-new users don't see notes for features they never missed.
      if (seen == null) {
        markSeen();
        return;
      }

      // Already current (or somehow ahead) — nothing to show.
      if (compareVersions(CURRENT_VERSION, seen) <= 0) return;

      const fresh = entriesNewerThan(seen);
      if (fresh.length === 0) {
        // Version bumped but no notes authored — record it silently so we don't
        // re-check every launch.
        markSeen();
        return;
      }
      setEntries(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, [markSeen]);

  const dismiss = useCallback(() => {
    setEntries(null);
    markSeen();
  }, [markSeen]);

  const open = useCallback(() => {
    if (CHANGELOG.length > 0) setEntries(CHANGELOG);
  }, []);

  return (
    <WhatsNewContext.Provider value={{ open }}>
      {children}
      {entries && entries.length > 0 && (
        <WhatsNewModal entries={entries} onDismiss={dismiss} />
      )}
    </WhatsNewContext.Provider>
  );
};
