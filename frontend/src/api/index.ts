const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const api = {
  // Auth
  register: (email: string, password: string) =>
    fetch(`${BASE_URL}/auth/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }).then(r => r.json()),

  login: (email: string, password: string) =>
    fetch(`${BASE_URL}/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }).then(r => r.json()),

  // Dashboard
  getStats: (company?: string) =>
    fetch(`${BASE_URL}/dashboard/stats${company ? `?company=${company}` : ''}`, { headers: getHeaders() }).then(r => r.json()),

  // Topics
  getTopics: () =>
    fetch(`${BASE_URL}/topics`, { headers: getHeaders() }).then(r => r.json()),

  createTopic: (name: string, category: string) =>
    fetch(`${BASE_URL}/topics`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, category }) }).then(r => r.json()),

  updateTopicStatus: (id: number, status: string) =>
    fetch(`${BASE_URL}/topics/${id}/status`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ status }) }).then(r => r.json()),

  // Flashcards
  getDueCards: () =>
    fetch(`${BASE_URL}/flashcards/due`, { headers: getHeaders() }).then(r => r.json()),

  getCards: (topicId?: number) =>
    fetch(`${BASE_URL}/flashcards${topicId ? `?topicId=${topicId}` : ''}`, { headers: getHeaders() }).then(r => r.json()),

  createCard: (topicId: number, question: string, answer: string) =>
    fetch(`${BASE_URL}/flashcards`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ topicId, question, answer }) }).then(r => r.json()),

  reviewCard: (id: number, quality: number) =>
    fetch(`${BASE_URL}/flashcards/${id}/review`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ quality }) }).then(r => r.json()),

  generateCards: (topicId: number, notes: string) =>
    fetch(`${BASE_URL}/flashcards/generate`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ topicId, notes }) }).then(r => r.json()),

  // Questions
  getQuestions: (filters: { company?: string; category?: string; difficulty?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    return fetch(`${BASE_URL}/questions?${params}`, { headers: getHeaders() }).then(r => r.json());
  },

  updateQuestionProgress: (id: number, status: string) =>
    fetch(`${BASE_URL}/questions/${id}/progress`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ status }) }).then(r => r.json()),

  // Mock Interview
  startInterview: (company: string, difficulty: string, category?: string) =>
    fetch(`${BASE_URL}/interview/start`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ company, difficulty, category }) }).then(r => r.json()),

  submitInterview: (sessionId: number, code: string, language: string) =>
    fetch(`${BASE_URL}/interview/${sessionId}/submit`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ code, language }) }).then(r => r.json()),

  getInterviewHistory: () =>
    fetch(`${BASE_URL}/interview/history`, { headers: getHeaders() }).then(r => r.json()),

  // Company Readiness Report
  getReport: (company: string) =>
    fetch(`${BASE_URL}/report/${company}`, { headers: getHeaders() }).then(r => r.json()),

  getReportTrend: (company: string) =>
    fetch(`${BASE_URL}/report/${company}/trend`, { headers: getHeaders() }).then(r => r.json()),

  // Study session (updates streak)
  recordStudySession: () =>
    fetch(`${BASE_URL}/dashboard/study-session`, { method: 'POST', headers: getHeaders() }).then(r => r.json()),
};
