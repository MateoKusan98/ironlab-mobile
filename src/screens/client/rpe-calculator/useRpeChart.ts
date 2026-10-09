import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionService, RpeChart } from '../../../services/session.service';

/**
 * The engine's RPE chart, kept on the phone after the first fetch so the calculator
 * still works in a basement gym. Not per-user: it is the same table for everyone.
 * The cached copy is shown at once and replaced by the server's whenever it answers,
 * so a retuned chart reaches the calculator on its next open.
 */
const CACHE_KEY = 'rpeChart:v1';

export type RpeChartState =
  | { status: 'loading' }
  | { status: 'ready'; chart: RpeChart }
  | { status: 'unavailable' };

function isChart(value: unknown): value is RpeChart {
  const c = value as RpeChart | null;
  return !!c && Array.isArray(c.rpe) && Array.isArray(c.pctByReps) && c.pctByReps.length > 0;
}

async function readCached(): Promise<RpeChart | null> {
  try {
    const parsed: unknown = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) ?? 'null');
    return isChart(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useRpeChart(): RpeChartState {
  const [state, setState] = useState<RpeChartState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;
    let haveChart = false;
    const show = (chart: RpeChart) => {
      haveChart = true;
      if (mounted) setState({ status: 'ready', chart });
    };

    readCached().then((cached) => { if (cached && !haveChart) show(cached); });
    sessionService
      .getRpeChart()
      .then((chart) => {
        show(chart);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(chart)).catch(() => undefined);
      })
      .catch(async () => {
        // Offline: the cached copy (if any) is already up, or about to be.
        const cached = await readCached();
        if (cached) show(cached);
        else if (mounted && !haveChart) setState({ status: 'unavailable' });
      });

    return () => { mounted = false; };
  }, []);

  return state;
}
