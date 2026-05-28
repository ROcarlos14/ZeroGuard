import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  department: string;
  isActive: boolean;
  mfaEnabled: boolean;
  riskScore: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  deviceId: string | null;
  requiresMFA: boolean;
  isAuthenticated: boolean;
  login: (data: { user: User; accessToken: string; refreshToken: string; sessionId: string; deviceId: string; requiresMFA: boolean }) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setMFAVerified: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      deviceId: null,
      requiresMFA: false,
      isAuthenticated: false,
      login: (data) => set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        sessionId: data.sessionId,
        deviceId: data.deviceId,
        requiresMFA: data.requiresMFA,
        isAuthenticated: !data.requiresMFA,
      }),
      logout: () => set({
        user: null, accessToken: null, refreshToken: null,
        sessionId: null, deviceId: null, requiresMFA: false, isAuthenticated: false,
      }),
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setMFAVerified: () => set({ requiresMFA: false, isAuthenticated: true }),
    }),
    { name: 'zeroguard-auth' }
  )
);
