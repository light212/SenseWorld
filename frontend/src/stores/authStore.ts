/**
 * Auth store for managing authentication state.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  token: string | null;
  userId: string | null;
  _hasHydrated: boolean;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      _hasHydrated: false,
      setToken: (token) => set({ token }),
      setUserId: (userId) => set({ userId }),
      logout: () => set({ token: null, userId: null }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to check if store has been hydrated
export const useAuthHydration = () => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  return hasHydrated;
};
