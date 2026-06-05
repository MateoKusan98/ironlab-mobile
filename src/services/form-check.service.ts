import { api } from './api';

export interface FormCheckBreakdown {
  category: string;
  rating: 'Good' | 'Needs Work' | 'Critical';
  feedback: string;
}

export interface AIFormCheckAnalysis {
  exercise: string;
  overallScore: number;
  overallFeedback: string;
  breakdown: FormCheckBreakdown[];
  keyCorrections: string[];
  drills: string[];
}

export interface FormCheckRequest {
  id: string;
  exerciseName: string;
  userNotes: string | null;
  mediaUrls: string[];
  checkType: 'ai' | 'coach';
  aiAnalysis: AIFormCheckAnalysis | null;
  coachResponse: string | null;
  status: 'pending' | 'reviewed';
  createdAt: string;
}

export const formCheckService = {
  analyzeAI: async (
    imageUris: string[],
    exerciseName: string,
    userNotes?: string,
  ): Promise<{ id: string; aiAnalysis: AIFormCheckAnalysis; mediaUrls: string[] }> => {
    const formData = new FormData();
    imageUris.forEach((uri, i) => {
      formData.append('images', {
        uri,
        name: `form-${i}.jpg`,
        type: 'image/jpeg',
      } as any);
    });
    formData.append('exerciseName', exerciseName);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post('/form-check/ai-analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  analyzeVideo: async (
    videoUri: string,
    exerciseName: string,
    userNotes?: string,
  ): Promise<{ id: string; aiAnalysis: AIFormCheckAnalysis; mediaUrls: string[] }> => {
    const formData = new FormData();
    formData.append('video', {
      uri: videoUri,
      name: 'form-video.mp4',
      type: 'video/mp4',
    } as any);
    formData.append('exerciseName', exerciseName);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post('/form-check/ai-analyze-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  submitCoach: async (
    mediaUris: string[],
    mediaType: 'image' | 'video',
    exerciseName: string,
    userNotes?: string,
  ): Promise<{ id: string; status: string }> => {
    const formData = new FormData();
    mediaUris.forEach((uri, i) => {
      formData.append('media', {
        uri,
        name: mediaType === 'video' ? `form-video-${i}.mp4` : `form-${i}.jpg`,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      } as any);
    });
    formData.append('exerciseName', exerciseName);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post('/form-check/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  getMyRequests: async (): Promise<FormCheckRequest[]> => {
    const { data } = await api.get('/form-check/my-requests');
    return data.data;
  },

  getQueue: async (): Promise<(FormCheckRequest & { user: { id: string; name: string } })[]> => {
    const { data } = await api.get('/form-check/queue');
    return data.data;
  },

  respond: async (id: string, coachResponse: string): Promise<void> => {
    await api.post(`/form-check/${id}/respond`, { coachResponse });
  },
};
