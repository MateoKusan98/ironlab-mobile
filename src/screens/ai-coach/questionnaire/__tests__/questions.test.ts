import {
  DONT_KNOW,
  buildProfilePatch,
  changedKeys,
  getSections,
  hydrateAnswers,
  isSameAnswer,
  summarizeAnswer,
} from '../questions';

// The settings screen saves a PARTIAL profile: only what the athlete touched. Every
// test here guards that contract, because the failure mode is silent — an extra key
// overwrites a setting nobody edited, a missing key drops an edit the athlete made,
// and a phantom diff nags about unsaved changes that don't exist.

const t = (key: string): string => key;
const SECTIONS = getSections(t);
const EDITABLE_KEYS = new Set(SECTIONS.flatMap((s) => s.questions.map((q) => String(q.id))));
const questionById = (id: string) => SECTIONS.flatMap((s) => s.questions).find((q) => String(q.id) === id)!;

describe('changedKeys', () => {
  it('treats a number read back as a string as unchanged', () => {
    // getProfile serialises every numeric column as a string ('3'); a slider writes a
    // real number. Same answer, two shapes — comparing them raw put a phantom
    // "1 unsaved change" on the save bar for a question nobody touched.
    expect(changedKeys({ jobStressLevel: '3' }, { jobStressLevel: 3 })).toEqual([]);
    expect(changedKeys({ squatMax: '140' }, { squatMax: '140.0' })).toEqual([]);
  });

  it('treats every flavour of empty as the same non-answer', () => {
    expect(changedKeys({}, { injuryHistory: '' })).toEqual([]);
    expect(changedKeys({ mobilityLimitations: [] }, {})).toEqual([]);
  });

  it('reports a real edit', () => {
    expect(changedKeys({ sleepQuality: 'poor' }, { sleepQuality: 'good' })).toEqual(['sleepQuality']);
    expect(changedKeys({}, { trainingDays: ['monday'] })).toEqual(['trainingDays']);
  });

  it('reports a cleared answer', () => {
    expect(changedKeys({ injuryHistory: 'left knee' }, { injuryHistory: '' })).toEqual(['injuryHistory']);
  });

  it('does not treat a non-numeric field numerically', () => {
    expect(isSameAnswer('specificGoal', '3', 3)).toBe(false);
  });
});

describe('buildProfilePatch', () => {
  const answers = {
    sleepQuality: 'good',
    avgSleepHours: '7',
    trainingDays: ['monday', 'friday'],
    injuryHistory: 'left knee',
  };

  it('sends only the keys that changed', () => {
    expect(buildProfilePatch(['sleepQuality'], answers, EDITABLE_KEYS)).toEqual({ sleepQuality: 'good' });
  });

  it('coerces numeric fields the projection handed back as strings', () => {
    expect(buildProfilePatch(['avgSleepHours'], answers, EDITABLE_KEYS)).toEqual({ avgSleepHours: 7 });
  });

  it('sends an explicit null for a cleared answer rather than omitting the key', () => {
    // POST /ai-coach/profile Object.assign's the DTO onto the stored row, so an omitted
    // key keeps its old value — omitting a cleared field would leave the coach
    // programming off text the athlete just deleted.
    expect(buildProfilePatch(['injuryHistory'], { injuryHistory: '' }, EDITABLE_KEYS))
      .toEqual({ injuryHistory: null });
  });

  it('clears an answer the athlete withdrew with "I don\'t know"', () => {
    expect(buildProfilePatch(['recoverySpeed'], { recoverySpeed: DONT_KNOW }, EDITABLE_KEYS))
      .toEqual({ recoverySpeed: null });
  });

  it('never puts the competition date in the profile payload', () => {
    // It belongs to /ai-coach/competition; the profile DTO rejects it and
    // forbidNonWhitelisted would 400 the whole save.
    expect(buildProfilePatch(['competitionDate', 'competitionType', 'sleepQuality'],
      { competitionDate: '2026-11-01', competitionType: 'meet', sleepQuality: 'good' }, EDITABLE_KEYS))
      .toEqual({ sleepQuality: 'good' });
  });

  it('drops keys the form does not own', () => {
    expect(buildProfilePatch(['id', 'userId', 'createdAt'], { id: 'x' } as never, EDITABLE_KEYS)).toEqual({});
  });
});

describe('hydrateAnswers', () => {
  it('normalises the padded DECIMAL minPlateKg back onto an option value', () => {
    // MySQL returns decimal(4,2) as '1.25'/'0.50'; the select's option values are
    // canonical strings, so '0.50' would match no option and show as unset.
    expect(hydrateAnswers({ minPlateKg: '0.50' }, null, new Set(['minPlateKg'])).minPlateKg).toBe('0.5');
  });

  it('takes the competition date from the plan payload, not the profile', () => {
    const answers = hydrateAnswers(null, { competitionDate: '2026-11-01T00:00:00.000Z', competitionType: 'pr_test' }, new Set());
    expect(answers.competitionDate).toBe('2026-11-01');
    expect(answers.competitionType).toBe('pr_test');
  });

  it('skips internal columns the save DTO would reject', () => {
    expect(hydrateAnswers({ id: 'abc', sleepQuality: 'good' }, null, new Set(['sleepQuality'])))
      .toEqual({ sleepQuality: 'good' });
  });
});

describe('summarizeAnswer', () => {
  it('shows the option label, never the stored code', () => {
    // 'commercial_gym' on a settings row tells the athlete nothing.
    const question = questionById('equipmentAccess');
    expect(summarizeAnswer(question, { equipmentAccess: 'commercial_gym' }, t))
      .toBe('aiCoachExtendedSetup.optionCommercialGym');
  });

  it('returns null when there is nothing to say', () => {
    expect(summarizeAnswer(questionById('equipmentAccess'), {}, t)).toBeNull();
  });

  it('joins a multi-select', () => {
    const summary = summarizeAnswer(questionById('trainingDays'), { trainingDays: ['monday', 'friday'] }, t);
    expect(summary).toBe('aiCoachExtendedSetup.optionMonday, aiCoachExtendedSetup.optionFriday');
  });
});
