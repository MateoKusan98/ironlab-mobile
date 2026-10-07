import { useEffect, useRef, useState } from 'react';
import { sessionService, LastPerformance } from '../../../services/session.service';

/**
 * "Last time" for every movement in the live workout, fetched in one request.
 *
 * Only names not asked about yet are fetched, so adding or swapping an exercise costs
 * one small request for that movement instead of refetching the session. A failed
 * fetch (offline in a basement gym) leaves the line off — it is a convenience, and the
 * workout must never wait on it.
 */
export function useLastPerformance(exerciseNames: string[], enabled: boolean): Record<string, LastPerformance> {
  const [byName, setByName] = useState<Record<string, LastPerformance>>({});
  const requestedRef = useRef<Set<string>>(new Set());
  // Unmount-only guard. Not a per-run `cancelled` flag: a request still in flight when
  // the next exercise is added must still land, or its names stay marked as asked and
  // never come back.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  // A stable dependency: the hook re-runs when the SET of names changes, not on every
  // keystroke that rebuilds the exercises array.
  const namesKey = [...new Set(exerciseNames)].sort().join('\n');

  useEffect(() => {
    if (!enabled) return;
    const missing = namesKey.split('\n').filter((n) => n && !requestedRef.current.has(n));
    if (!missing.length) return;
    missing.forEach((n) => requestedRef.current.add(n));
    sessionService
      .getLastPerformance(missing)
      .then((found) => { if (mountedRef.current) setByName((prev) => ({ ...prev, ...found })); })
      // Let a later change retry these names.
      .catch(() => missing.forEach((n) => requestedRef.current.delete(n)));
  }, [namesKey, enabled]);

  return byName;
}
