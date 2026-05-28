import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        if (data.success) {
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth API ───────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  mfaSetup: () => api.post('/auth/mfa/setup'),
  mfaVerify: (code: string) => api.post('/auth/mfa/verify', { code }),
  mfaDisable: (password: string) => api.post('/auth/mfa/disable', { password }),
};

// ── Users API ──────────────────────────────────────────
export const usersAPI = {
  create: (data: any) => api.post('/users', data),
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  devices: (id: string) => api.get(`/users/${id}/devices`),
  sessions: (id: string) => api.get(`/users/${id}/sessions`),
  logs: (id: string) => api.get(`/users/${id}/logs`),
  updateRiskScore: (id: string, riskScore: number) => api.put(`/users/${id}/risk-score`, { riskScore }),
};

// ── Devices API ────────────────────────────────────────
export const devicesAPI = {
  list: () => api.get('/devices'),
  get: (id: string) => api.get(`/devices/${id}`),
  register: (data: any) => api.post('/devices/register', data),
  setTrust: (id: string, data: any) => api.put(`/devices/${id}/trust`, data),
  submitPosture: (id: string, data: any) => api.post(`/devices/${id}/posture`, data),
  remove: (id: string) => api.delete(`/devices/${id}`),
  sessions: (id: string) => api.get(`/devices/${id}/sessions`),
};

// ── Sessions API ───────────────────────────────────────
export const sessionsAPI = {
  list: () => api.get('/sessions'),
  active: () => api.get('/sessions/active'),
  terminate: (id: string) => api.delete(`/sessions/${id}`),
  terminateAll: (userId: string) => api.delete(`/sessions/user/${userId}`),
  heartbeat: (id: string) => api.put(`/sessions/${id}/activity`),
};

// ── Resources API ──────────────────────────────────────
export const resourcesAPI = {
  list: () => api.get('/resources'),
  get: (id: string) => api.get(`/resources/${id}`),
  create: (data: any) => api.post('/resources', data),
  update: (id: string, data: any) => api.put(`/resources/${id}`, data),
  remove: (id: string) => api.delete(`/resources/${id}`),
  testAccess: (id: string, data?: any) => api.post(`/resources/${id}/access`, data || {}),
};

// ── Policies API ───────────────────────────────────────
export const policiesAPI = {
  list: () => api.get('/policies'),
  create: (data: any) => api.post('/policies', data),
  update: (id: string, data: any) => api.put(`/policies/${id}`, data),
  remove: (id: string) => api.delete(`/policies/${id}`),
  toggle: (id: string) => api.put(`/policies/${id}/toggle`),
  evaluate: (data: any) => api.post('/policies/evaluate', data),
};

// ── Logs API ───────────────────────────────────────────
export const logsAPI = {
  list: (params?: any) => api.get('/logs', { params }),
  stats: () => api.get('/logs/stats'),
  timeline: () => api.get('/logs/timeline'),
  topDenied: () => api.get('/logs/top-denied-users'),
  topResources: () => api.get('/logs/top-resources'),
};

// ── Threats API ────────────────────────────────────────
export const threatsAPI = {
  list: (params?: any) => api.get('/threats', { params }),
  active: () => api.get('/threats/active'),
  create: (data: any) => api.post('/threats', data),
  resolve: (id: string) => api.put(`/threats/${id}/resolve`),
  stats: () => api.get('/threats/stats'),
};

// ── Analytics API ──────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  riskMatrix: () => api.get('/analytics/risk-matrix'),
  geoAnomaly: () => api.get('/analytics/geo-anomaly'),
};
