import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { badgesService, BadgeKey, BadgesResponse } from '../services/badges.service';
import { BadgeUnlockCelebration } from '../components/BadgeUnlockCelebration';
import { useAuthStore } from '../stores/auth.store';

interface BadgeCelebrationValue {
  /** Force the server to (re)award any earned badges, then celebrate anything new. */
  refresh: () => Promise<void>;
}

const BadgeCelebrationContext = createContext<BadgeCelebrationValue>({
  refresh: async () => {},
});

export const useBadgeCelebration = () => useContext(BadgeCelebrationContext);

const seenKey = (userId: string) => `seenBadges:${userId}`;

/**
 * Owns badge-unlock celebrations app-wide.
 *
 * The server is the source of truth for which badges are unlocked (it awards
 * them as side effects of sessions, PRs and meals). This provider compares that
 * list against a per-user "seen" set persisted on the device, and pops the
 * celebration for anything new. Because it lives above the navigator, the popup
 * survives screen changes and re-renders, and it can be triggered from anywhere
 * via `refresh()`.
 */
export const BadgeCelebrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<BadgeKey[]>([]);

  // Badges we've already celebrated on this device, for the current user.
  const seenRef = useRef<Set<BadgeKey> | null>(null);
  // True until the first reconcile adopts the user's existing collection. We
  // seed silently so upgrading users don't get their whole history replayed.
  const needsSeedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ['badges'],
    queryFn: () => badgesService.getMyBadges(),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
  const dataRef = useRef<BadgesResponse | undefined>(data);
  dataRef.current = data;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const persistSeen = useCallback((uid: string, set: Set<BadgeKey>) => {
    AsyncStorage.setItem(seenKey(uid), JSON.stringify([...set])).catch(() => {});
  }, []);

  const reconcile = useCallback(() => {
    const uid = userIdRef.current;
    const seen = seenRef.current;
    const unlocked = dataRef.current?.unlockedBadges;
    if (!uid || !seen || !unlocked) return;

    // First load for this user on this device: adopt the existing collection
    // without celebrating it.
    if (needsSeedRef.current) {
      needsSeedRef.current = false;
      const seeded = new Set(unlocked);
      seenRef.current = seeded;
      persistSeen(uid, seeded);
      return;
    }

    const fresh = unlocked.filter((k) => !seen.has(k));
    if (fresh.length === 0) return;
    fresh.forEach((k) => seen.add(k));
    persistSeen(uid, seen);
    setQueue((q) => [...q, ...fresh.filter((k) => !q.includes(k))]);
  }, [persistSeen]);

  // Load the seen-set whenever the user changes, then reconcile.
  useEffect(() => {
    seenRef.current = null;
    needsSeedRef.current = false;
    setQueue([]);
    if (!userId) return;

    let cancelled = false;
    AsyncStorage.getItem(seenKey(userId)).then((raw) => {
      if (cancelled || userIdRef.current !== userId) return;
      if (raw == null) {
        needsSeedRef.current = true;
        seenRef.current = new Set();
      } else {
        seenRef.current = new Set(JSON.parse(raw) as BadgeKey[]);
      }
      reconcile();
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reconcile]);

  // Reconcile whenever the server list updates (e.g. after refresh()).
  useEffect(() => {
    reconcile();
  }, [data, reconcile]);

  const refresh = useCallback(async () => {
    if (!userIdRef.current) return;
    // syncBadges awaits all server-side awarding, sidestepping the fire-and-forget
    // races in session/meal completion. Then refetch the full list so reconcile
    // sees the newly unlocked badges.
    try {
      await badgesService.syncBadges();
    } catch {
      // Network hiccup — the next refresh / screen visit will catch up.
    }
    // refetchQueries resolves only after the fetch completes, so reconcile()
    // sees the updated data by the time refresh() returns.
    try {
      await queryClient.refetchQueries({ queryKey: ['badges'] });
    } catch {
      // Swallow — stale data is fine; next reconcile will catch up.
    }
  }, [queryClient]);

  return (
    <BadgeCelebrationContext.Provider value={{ refresh }}>
      {children}
      {queue.length > 0 && (
        <BadgeUnlockCelebration newBadgeKeys={queue} onDismiss={() => setQueue([])} />
      )}
    </BadgeCelebrationContext.Provider>
  );
};
