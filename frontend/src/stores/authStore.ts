/**
 * Auth store for managing authentication state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  userId: string | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      setToken: (token) => set({ token }),
      setUserId: (userId) => set({ userId }),
      logout: () => set({ token: null, userId: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);
