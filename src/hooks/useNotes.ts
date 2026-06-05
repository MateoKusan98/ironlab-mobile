import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesService } from '../services/notes.service';
import { CreateCoachNoteDto } from '@shared';

export const useClientNotes = (clientId: string) => {
  return useQuery({
    queryKey: ['notes', clientId],
    queryFn: () => notesService.getNotesForClient(clientId),
    enabled: !!clientId,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCoachNoteDto) => notesService.createNote(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.clientId] });
    },
  });
};
