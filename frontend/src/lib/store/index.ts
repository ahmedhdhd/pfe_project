import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, UserRole, Tenant } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

interface ThemeState {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

interface TenantState {
  currentTenant: Tenant | null;
  setTenant: (tenant: Tenant) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "theme-storage",
    }
  )
);

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      currentTenant: null,
      setTenant: (tenant) => set({ currentTenant: tenant }),
    }),
    {
      name: "tenant-storage",
    }
  )
);

// Helper hooks
export const useRole = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role || null;
};

export const useIsAdmin = () => {
  const role = useRole();
  return role === "admin";
};

export const useIsTeacher = () => {
  const role = useRole();
  return role === "teacher";
};

export const useIsStudent = () => {
  const role = useRole();
  return role === "student";
};

export const useHasRole = (allowedRoles: UserRole[]) => {
  const role = useRole();
  return role ? allowedRoles.includes(role) : false;
};

// Export onboarding store
export * from "./onboarding";

// Export organization config store
export * from "./organization-config";
