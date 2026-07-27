import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ForceUpdateModal } from '../components/ForceUpdateModal';
import {
  fetchVersionRequirement,
  isUpdateRequired,
  AppVersionRequirement,
} from '../services/appVersion.service';

/**
 * App-wide force-update gate.
 *
 * On launch — and again each time the app returns to the foreground — it asks
 * the backend for the minimum supported version and, if this build is older,
 * renders a non-dismissable update wall over everything (auth included). The
 * foreground re-check matters because the backend can raise the floor while a
 * user has the app parked in the background; they hit the wall on their way back
 * in rather than firing requests an incompatible API will reject.
 *
 * It always fails *open*: a missing/failed response never blocks, so a backend
 * hiccup can't lock the whole userbase out of the app.
 */
export const ForceUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requirement, setRequirement] = useState<AppVersionRequirement | null>(null);
  const blocked = requirement != null && isUpdateRequired(requirement);

  useEffect(() => {
    let cancelled = false;

    // Only ever escalate to blocked; a later clean response never tears down a
    // wall we've already raised.
    const check = () => {
      fetchVersionRequirement().then((req) => {
        if (!cancelled && req && isUpdateRequired(req)) setRequirement(req);
      });
    };

    check();

    let previous = AppState.currentState as AppStateStatus;
    const sub = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') check();
      previous = next;
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return (
    <>
      {children}
      {blocked && <ForceUpdateModal requirement={requirement!} />}
    </>
  );
};
