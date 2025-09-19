import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true' // Skip ngrok browser warning
  },
  withCredentials: true // Always send cookies (JWT) with requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  verifyToken: async () => {
    const response = await api.post('/auth/verify-token');
    return response.data;
  }
};

// Meeting API calls
export const meetingAPI = {
  createMeeting: async (meetingData) => {
    const response = await api.post('/meetings/create', meetingData);
    return response.data;
  },
  
  joinMeeting: async (meetingId, password = '') => {
    const response = await api.post(`/meetings/join/${meetingId}`, { password });
    return response.data;
  },
  
  getMeeting: async (meetingId) => {
    const response = await api.get(`/meetings/${meetingId}`);
    return response.data;
  },
  
  getPublicMeeting: async (meetingId) => {
    // Create a new axios instance without auth for public requests
    const publicApi = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await publicApi.get(`/meetings/public/${meetingId}`);
    return response.data;
  },
  
  getUserMeetings: async (type = 'all', page = 1, limit = 10) => {
    const response = await api.get(`/meetings?type=${type}&page=${page}&limit=${limit}`);
    return response.data;
  },
  
  deleteMeeting: async (meetingId) => {
    const response = await api.delete(`/meetings/${meetingId}`);
    return response.data;
  },
  
  leaveMeeting: async (meetingId) => {
    const response = await api.post(`/meetings/${meetingId}/leave`);
    return response.data;
  }
};

export default api;