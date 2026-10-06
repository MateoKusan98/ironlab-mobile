import { useState } from 'react';
import { Alert } from 'react-native';
import { ExerciseCue } from '../../../services/exerciseCue.service';
import { Exercise } from '../workoutState';

/**
 * The inline "add a cue for next time" form. Keyed by exercise index, so at most one
 * exercise has it open at a time.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useCueForm(
  exercises: Exercise[],
  saveCue: (exerciseName: string, text: string) => Promise<boolean>,
  deleteCue: (cue: ExerciseCue) => Promise<boolean>,
) {
  // Which exercise (by index) has its inline "add a cue" form open.
  const [addCueFor, setAddCueFor] = useState<number | null>(null);
  const [newCueText, setNewCueText] = useState('');

  const savePersonalCue = async (exIdx: number) => {
    const ok = await saveCue(exercises[exIdx].name, newCueText);
    if (!ok) {
      if (newCueText.trim()) Alert.alert('Error', 'Could not save cue. Check connection.');
      return;
    }
    setAddCueFor(null);
    setNewCueText('');
  };

  const deletePersonalCue = async (cue: ExerciseCue) => {
    if (!(await deleteCue(cue))) Alert.alert('Error', 'Could not delete cue.');
  };

  const openCueForm = (exIdx: number) => { setAddCueFor(exIdx); setNewCueText(''); };
  const closeCueForm = () => { setAddCueFor(null); setNewCueText(''); };

  return { addCueFor, newCueText, setNewCueText, savePersonalCue, deletePersonalCue, openCueForm, closeCueForm };
}
