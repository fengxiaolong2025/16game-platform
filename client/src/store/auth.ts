import { create } from 'zustand';
import { authApi } from '../api';

interface User {
  id: string;
  nickname: string;
  avatar?: string;
  phone?: string;
  email?: string;
  games?: string[];
  game_ids?: string;
  role?: number;
  username?: string;
  bio?: string;
  position?: string;
  player_photos?: string[];
  ladder_score?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  loading: false,

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  fetchUser: async () => {
    if (!get().token) return;
    set({ loading: true });
    try {
      const res = await authApi.getMe();
      const user = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false });
    } catch {
      get().logout();
      set({ loading: false });
    }
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));
