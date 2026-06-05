import { api } from './api';
import { ApiResponse, CoachNoteResponse, CreateCoachNoteDto } from '@shared';

export const notesService = {
  createNote: async (dto: CreateCoachNoteDto): Promise<CoachNoteResponse> => {
    const { data } = await api.post<ApiResponse<CoachNoteResponse>>('/notes', dto);
    return data.data;
  },

  getNotesForClient: async (clientId: string): Promise<CoachNoteResponse[]> => {
    const { data } = await api.get<ApiResponse<CoachNoteResponse[]>>(`/notes/${clientId}`);
    return data.data;
  },
};
