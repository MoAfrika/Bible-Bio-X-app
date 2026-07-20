import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

export const bibleAPI = {
  getVerse: async (reference) => {
    const { data } = await api.get(`/bible/verse?reference=${encodeURIComponent(reference)}`);
    return data;
  },
  getVerseOfDay: async () => {
    const { data } = await api.get('/bible/verse-of-day');
    return data;
  }
};

export const moodAPI = {
  save: async (mood) => {
    const { data } = await api.post('/mood', { mood });
    return data;
  },
  getHistory: async () => {
    const { data } = await api.get('/mood/history');
    return data;
  }
};

export const versesAPI = {
  save: async (verse_reference, verse_text, translation) => {
    const { data } = await api.post('/verses/save', { verse_reference, verse_text, translation });
    return data;
  },
  getSaved: async () => {
    const { data } = await api.get('/verses/saved');
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/verses/${id}`);
    return data;
  }
};

export const generateAPI = {
  bio: (character_name, focus, depth) => 
    `${API_URL}/api/generate/bio`,
  explainer: (reference, style) => 
    `${API_URL}/api/generate/explainer`,
  sermon: (topic, audience, style) => 
    `${API_URL}/api/generate/sermon`,
  parable: (parable_name, focus) => 
    `${API_URL}/api/generate/parable`,
  devotional: (date) => 
    `${API_URL}/api/generate/devotional`,
  theologian: (question, complexity) => 
    `${API_URL}/api/generate/theologian`,
  prayer: (topic, tone) => 
    `${API_URL}/api/generate/prayer`,
  story: (topic) => 
    `${API_URL}/api/generate/story`
};

export default api;