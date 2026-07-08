import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  drawRatedQuestion,
  eloDelta,
  clampRating,
  QuizQuestion,
  QUESTION_RATING,
  DEFAULT_QUIZ_RATING,
  QUIZ_RATING_STORAGE_KEY,
  QUIZ_RATING_MILESTONES,
} from '../data/fitnessQuiz';
import { badgesService } from '../services/badges.service';

/** How many recently-seen question ids to avoid re-drawing. */
const RECENT_WINDOW = 40;

export interface RatedAnswerResult {
  /** Rating change from this answer (already clamped). */
  delta: number;
  /** The player's rating after this answer. */
  rating: number;
}

/**
 * Owns the player's chess-style quiz rating: restores it from device storage,
 * draws questions matched to the player's level, applies Elo updates, persists
 * them, and reports crossed badge milestones to the server. Shared by the
 * full-screen FitnessQuiz and the Home-screen quiz card, so both move the
 * same rating.
 */
export function useRatedQuiz() {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(DEFAULT_QUIZ_RATING);
  const [question, setQuestion] = useState<QuizQuestion>(() => drawRatedQuestion(DEFAULT_QUIZ_RATING));

  // Refs mirror state so callbacks never act on a stale rating/question.
  const ratingRef = useRef(rating);
  const questionRef = useRef(question);
  const recentIds = useRef<number[]>([]);
  const answeredAny = useRef(false);

  // Restore the stored rating — applied only if nothing has been answered yet,
  // so a slow read never swaps a question the user is looking at mid-answer.
  useEffect(() => {
    AsyncStorage.getItem(QUIZ_RATING_STORAGE_KEY)
      .then((v) => {
        const saved = Number(v);
        if (Number.isFinite(saved) && saved > 0 && !answeredAny.current) {
          const restored = clampRating(saved);
          ratingRef.current = restored;
          setRating(restored);
          const q = drawRatedQuestion(restored, recentIds.current);
          questionRef.current = q;
          setQuestion(q);
        }
      })
      .catch(() => {});
  }, []);

  /** Applies the Elo result of answering the current question. */
  const scoreAnswer = (correct: boolean): RatedAnswerResult => {
    answeredAny.current = true;
    const before = ratingRef.current;
    const q = questionRef.current;
    const next = clampRating(before + eloDelta(before, QUESTION_RATING[q.difficulty], correct));
    ratingRef.current = next;
    setRating(next);
    AsyncStorage.setItem(QUIZ_RATING_STORAGE_KEY, String(next)).catch(() => {});

    // Crossed a rating milestone upward → let the server award the badge, then
    // refetch so the celebration pops (works mid-run, even in endless quizzes
    // that never reach a results screen).
    if (QUIZ_RATING_MILESTONES.some((m) => before < m && next >= m)) {
      badgesService
        .recordQuizRating(next)
        .then(() => queryClient.invalidateQueries({ queryKey: ['badges'] }))
        .catch(() => {});
    }
    return { delta: next - before, rating: next };
  };

  /** Draws the next question near the current rating, avoiding recent repeats. */
  const nextQuestion = () => {
    recentIds.current = [...recentIds.current.slice(-(RECENT_WINDOW - 1)), questionRef.current.id];
    const q = drawRatedQuestion(ratingRef.current, recentIds.current);
    questionRef.current = q;
    setQuestion(q);
  };

  return { rating, question, scoreAnswer, nextQuestion };
}
