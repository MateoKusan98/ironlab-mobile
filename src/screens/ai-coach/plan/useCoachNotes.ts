import { useState } from 'react';
import { Alert } from 'react-native';
import { aiCoachService, CoachNote } from '../../../services/ai-coach.service';

/**
 * Coach memory: the notes the athlete asks the coach to remember.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function useCoachNotes() {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);

  const handleAddNote = async (text: string) => {
    setNotesBusy(true);
    try {
      await aiCoachService.addNote(text);
      setNotes(await aiCoachService.getNotes());
    } catch {
      Alert.alert('Error', 'Could not save your note. Try again.');
    } finally {
      setNotesBusy(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id)); // optimistic
    try {
      await aiCoachService.deleteNote(id);
    } catch {
      setNotes(prev);
      Alert.alert('Error', 'Could not delete that note.');
    }
  };

  return { notes, setNotes, notesModalVisible, setNotesModalVisible, notesBusy, handleAddNote, handleDeleteNote };
}
