import type { NotificationPrefs } from '../../services/notificationPrefs.service';

export type PrefKey = Exclude<keyof NotificationPrefs, 'allEnabled'>;

export interface PrefRow {
  key: PrefKey;
  /** i18n key under notificationSettings.*, with the English default. */
  titleKey: string;
  title: string;
  bodyKey: string;
  body: string;
  coachOnly?: boolean;
}

/** The screen's sections, in the order an athlete thinks about them. */
export const PREF_SECTIONS: { titleKey: string; title: string; rows: PrefRow[] }[] = [
  {
    titleKey: 'sectionTraining', title: 'Training',
    rows: [
      { key: 'dailyMotivation', titleKey: 'dailyMotivation', title: 'Morning coach nudge', bodyKey: 'dailyMotivationBody', body: 'One message at 8:00 — training day, rest day, deload or comeback.' },
      { key: 'workoutReady', titleKey: 'workoutReady', title: 'Session ready', bodyKey: 'workoutReadyBody', body: 'When your coach signs off on or adjusts your next session.' },
      { key: 'restTimer', titleKey: 'restTimer', title: 'Rest timer sound', bodyKey: 'restTimerBody', body: 'Plays when rest ends, even with the app closed. The in-app countdown always runs.' },
    ],
  },
  {
    titleKey: 'sectionProgress', title: 'Progress',
    rows: [
      { key: 'prAlerts', titleKey: 'prAlerts', title: 'New records', bodyKey: 'prAlertsBody', body: 'The moment you set a PR.' },
      { key: 'weeklySummary', titleKey: 'weeklySummary', title: 'Week in review', bodyKey: 'weeklySummaryBody', body: 'Sunday evening: sessions, gains and bodyweight trend.' },
      { key: 'competitionDay', titleKey: 'competitionDay', title: 'Meet & test day', bodyKey: 'competitionDayBody', body: 'The morning of your competition or PR test.' },
    ],
  },
  {
    titleKey: 'sectionCoach', title: 'Coach & messages',
    rows: [
      { key: 'coachSuggestions', titleKey: 'coachSuggestions', title: 'Coach suggestions', bodyKey: 'coachSuggestionsBody', body: 'A new block, a deload, or a max worth updating.' },
      { key: 'messages', titleKey: 'messages', title: 'Messages', bodyKey: 'messagesBody', body: 'Direct messages from your coach and friends.' },
      { key: 'coachReviews', titleKey: 'coachReviews', title: 'Sessions to review', bodyKey: 'coachReviewsBody', body: "An athlete's session is waiting for your sign-off.", coachOnly: true },
    ],
  },
];
