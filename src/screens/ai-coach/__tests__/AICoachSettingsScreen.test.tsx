import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
// The shared setup stubs react-i18next so t() echoes the key. Search is the whole
// point of this screen and it matches on LABELS, so this file runs the real i18n
// stack and asserts against the English copy the athlete actually reads.
jest.unmock('react-i18next'); // must run before the imports below
/* eslint-disable import/first */
import '../../../i18n';
import { AICoachSettingsScreen } from '../AICoachSettingsScreen';
/* eslint-enable import/first */

// The point of this screen: reach ONE answer without walking the whole questionnaire.
// These tests hold that promise — the sections open independently, and search finds a
// question by what it says rather than by which step of the wizard it lived on.

jest.mock('../../../services/ai-coach.service', () => ({
  aiCoachService: {
    getProfile: jest.fn(async () => ({ equipmentAccess: 'commercial_gym', minPlateKg: '1.25' })),
    getPlan: jest.fn(async () => null),
    saveProfile: jest.fn(async () => {}),
    setCompetitionDate: jest.fn(async () => {}),
    clearCompetitionDate: jest.fn(async () => {}),
  },
}));

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const open = (params?: { focusSection?: string }) =>
  render(<AICoachSettingsScreen navigation={navigation as any} route={{ params } as any} />);

describe('AICoachSettingsScreen', () => {
  it('lands on the section list, not on question one of ten', async () => {
    const r = await open();
    await waitFor(() => expect(r.getByText('Constraints')).toBeTruthy());
    expect(r.getByText('Training Focus')).toBeTruthy();
    // Collapsed: the questions themselves are not on screen yet.
    expect(r.queryByText('Smallest weight plate you have')).toBeNull();
  });

  it('previews the saved answer on the collapsed section', async () => {
    const r = await open();
    // 'commercial_gym' is unreadable; the row shows the option label.
    await waitFor(() => expect(r.getByText(/Equipment access: Commercial Gym/)).toBeTruthy());
  });

  it('opens a section on tap without touching the others', async () => {
    const r = await open();
    await waitFor(() => expect(r.getByText('Constraints')).toBeTruthy());
    fireEvent.press(r.getByText('Constraints'));
    await waitFor(() => expect(r.getByText('Smallest weight plate you have')).toBeTruthy());
    expect(r.queryByText('How many hours do you sleep on average?')).toBeNull();
  });

  it('finds a single setting by what it is called', async () => {
    const r = await open();
    await waitFor(() => expect(r.getByText('Constraints')).toBeTruthy());
    fireEvent.changeText(r.getByPlaceholderText(/Search settings/), 'plate');
    await waitFor(() => expect(r.getByText('Smallest weight plate you have')).toBeTruthy());
    // …and only that one: unrelated sections drop out of the list entirely.
    expect(r.queryByText('Training Focus')).toBeNull();
  });

  it('finds a setting by its untranslated field id, so search survives a language switch', async () => {
    const r = await open();
    await waitFor(() => expect(r.getByText('Constraints')).toBeTruthy());
    fireEvent.changeText(r.getByPlaceholderText(/Search settings/), 'frequency');
    await waitFor(() => expect(r.getByText('Squat frequency preference')).toBeTruthy());
  });
});
