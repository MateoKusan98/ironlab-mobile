import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sessionService } from '../../../services/session.service';
import type { LiftingUnit } from '../../../units/weight';
import {
  Exercise,
  PlannedExercise,
  buildFromPlan,
  clearDraft,
  loadDraft,
  pruneOtherDrafts,
  reconcileDraft,
  restoreDraftOffline,
  saveDraft,
  unresolvedDeletions,
} from '../workoutState';

// Long enough that typing a set doesn't write on every keystroke, short enough
// that backgrounding the app right after an edit still captures it.
const DRAFT_SAVE_DEBOUNCE_MS = 400;

// The technique note is free text, so wait for a real pause in typing before
// spending a request on it.
const REVIEW_SAVE_DEBOUNCE_MS = 1200;

/**
 * The live workout's exercises: restored on mount, persisted as the athlete edits,
 * and the per-exercise self-report synced to the server.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useWorkoutSession(
  sessionId: string,
  plannedExercises: PlannedExercise[] | undefined,
  syncStart: (startedAtMs: number) => void,
  unit: LiftingUnit,
) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  // Sets deleted this session. Persisted with the draft so a delete that failed
  // offline can be retried instead of the row coming back on the next resume.
  const removedSetIdsRef = useRef<Set<string>>(new Set());
  // Last self-report successfully sent per exercise, so an idle re-render doesn't
  // re-PATCH the same rating and note over and over.
  const sentReviewsRef = useRef<Map<string, string>>(new Map());

  // Restore the session on mount. Three sources, in order of authority:
  //   1. the local draft — the athlete's own arrangement of the session
  //   2. the server's sets — the truth about anything already saved
  //   3. the plan we were launched with — the fallback when there's no draft
  // Without (1) the screen used to rebuild from (2) + (3) alone, which quietly
  // undid every edit that wasn't a completed set: removed exercises came back,
  // added and swapped ones disappeared, technique notes and typed-but-unticked
  // reps were lost.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [session, draft] = await Promise.all([
          sessionService.getSession(sessionId),
          loadDraft(sessionId),
        ]);
        if (cancelled) return;

        if (session.startedAt) {
          syncStart(new Date(session.startedAt).getTime());
        }

        const serverSets = session.sets ?? [];

        if (draft) {
          removedSetIdsRef.current = new Set(draft.removedSetIds ?? []);
          // A delete that failed while offline left the row on the server. Retry it
          // now rather than resurrecting a set the athlete threw away.
          for (const id of unresolvedDeletions(draft, serverSets)) {
            sessionService.deleteSet(id).catch(() => {});
          }
          setExercises(reconcileDraft(draft, serverSets, unit));
        } else {
          setExercises(buildFromPlan(plannedExercises, serverSets, unit));
        }
      } catch {
        // Offline or the fetch failed: fall back to whatever we have locally so the
        // athlete can keep logging rather than staring at an empty screen.
        const draft = await loadDraft(sessionId);
        if (cancelled) return;
        if (draft) {
          removedSetIdsRef.current = new Set(draft.removedSetIds ?? []);
          setExercises(restoreDraftOffline(draft, unit));
        } else if (plannedExercises?.length) {
          setExercises(buildFromPlan(plannedExercises, [], unit));
        }
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    })();

    // Drafts only mean anything while their session is live; drop the rest.
    pruneOtherDrafts(sessionId);

    return () => { cancelled = true; };
  }, [sessionId]);

  // Persist the athlete's arrangement as they edit it. Debounced because this
  // fires on every keystroke in a reps/weight/notes field.
  useEffect(() => {
    if (resumeLoading) return;
    const timer = setTimeout(() => {
      saveDraft(sessionId, exercises, [...removedSetIdsRef.current], unit);
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [exercises, resumeLoading, sessionId, unit]);

  /**
   * Push the "HOW DID IT GO?" self-report to the server.
   *
   * The rating and the note describe the exercise, but the only row the API gives
   * us to hang them on is a set — so they ride on the exercise's first saved set,
   * which is exactly where the coach's memory and the technique badge look for
   * them. Until now nothing sent them at all: they lived in component state and
   * died with the screen.
   *
   * Driven by an effect rather than the input handlers because an exercise with
   * nothing logged yet has no row to write to — this way the report is sent as
   * soon as its first set saves, however long after it was typed.
   */
  useEffect(() => {
    if (resumeLoading) return;
    const timer = setTimeout(() => {
      for (const ex of exercises) {
        const anchorId = ex.sets.find((set) => set.id)?.id;
        if (!anchorId) continue;
        if (ex.techniqueRating == null && !ex.exerciseNotes?.trim()) continue;

        // Send the note even when it's been emptied — otherwise the backend's
        // "keep what's there" merge would make a cleared note un-clearable.
        const notes = ex.exerciseNotes?.trim() ?? '';
        const payload = `${anchorId}|${ex.techniqueRating ?? ''}|${notes}`;
        if (sentReviewsRef.current.get(ex.name) === payload) continue;
        sentReviewsRef.current.set(ex.name, payload);

        sessionService
          .updateSet(anchorId, {
            techniqueNotes: notes,
            techniqueRating: ex.techniqueRating,
          })
          .catch(() => {
            // Let the next change retry. The draft still holds it either way —
            // no need to interrupt the workout over a note.
            sentReviewsRef.current.delete(ex.name);
          });
      }
    }, REVIEW_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [exercises, resumeLoading]);

  // Throw away the athlete's edits and go back to the plan as generated. Logged
  // sets survive — only the structure (additions, removals, substitutions) resets.
  const resetToPlan = () => {
    Alert.alert(
      'Reset to today\'s plan?',
      'Exercises you added, removed or swapped go back to the coach\'s plan. Sets you\'ve already logged are kept.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResumeLoading(true);
            await clearDraft(sessionId);
            removedSetIdsRef.current = new Set();
            sentReviewsRef.current = new Map();
            try {
              const session = await sessionService.getSession(sessionId);
              setExercises(buildFromPlan(plannedExercises, session.sets ?? [], unit));
            } catch {
              setExercises(buildFromPlan(plannedExercises, [], unit));
            }
            setResumeLoading(false);
          },
        },
      ],
    );
  };

  return { exercises, setExercises, resumeLoading, removedSetIdsRef, sentReviewsRef, resetToPlan };
}
