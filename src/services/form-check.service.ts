import { api } from './api';

import { appendFile } from '../utils/upload';
// These endpoints upload media AND run AI/ffmpeg server-side before responding,
// so they take far longer than the api client's 15s default. Video is the
// heaviest (≤60MB upload + frame extraction + GPT-4o vision on 8 frames).
const UPLOAD_TIMEOUT_MS = 60000;
const VIDEO_ANALYZE_TIMEOUT_MS = 120000;

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
      appendFile(formData, 'images', {
        uri,
        name: `form-${i}.jpg`,
        type: 'image/jpeg',
      });
    });
    formData.append('exerciseName', exerciseName);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post('/form-check/ai-analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: VIDEO_ANALYZE_TIMEOUT_MS,
    });
    return data.data;
  },

  analyzeVideo: async (
    videoUri: string,
    exerciseName: string,
    userNotes?: string,
  ): Promise<{ id: string; aiAnalysis: AIFormCheckAnalysis; mediaUrls: string[] }> => {
    const formData = new FormData();
    appendFile(formData, 'video', {
      uri: videoUri,
      name: 'form-video.mp4',
      type: 'video/mp4',
    });
    formData.append('exerciseName', exerciseName);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post('/form-check/ai-analyze-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: VIDEO_ANALYZE_TIMEOUT_MS,
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
      appendFile(formData, 'media', {
        uri,
        name: mediaType === 'video' ? `form-video-${i}.mp4` : `form-${i}.jpg`,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      });
    });
    formData.append('exerciseName', exerciseName);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post('/form-check/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
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
