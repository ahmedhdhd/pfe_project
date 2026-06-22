import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OrganizationConfig } from "@/lib/types/api";

interface OrganizationConfigState {
  config: OrganizationConfig | null;
  setConfig: (config: OrganizationConfig) => void;
  clearConfig: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useOrganizationConfigStore = create<OrganizationConfigState>()(
  persist(
    (set) => ({
      config: null,
      isLoading: false,
      setConfig: (config) => set({ config, isLoading: false }),
      clearConfig: () => set({ config: null, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "organization-config-storage",
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

// Helper hooks for accessing specific config properties
export const useOrgTheme = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.theme || null;
};

export const useOrgName = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.name || "";
};

export const useOrgLogo = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.logoUrl || "";
};

export const useOrgFavicon = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.faviconUrl || "";
};

export const useOrgColors = () => {
  const theme = useOrgTheme();
  return {
    primary: theme?.primaryColor || "#6366f1", // Soft vibrant indigo
    secondary: theme?.secondaryColor || "#ec4899", // Soft vibrant pink
    fontFamily: theme?.fontFamily || "var(--font-geist-sans), sans-serif",
  };
};

export const useOrgMaintenanceMode = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.maintenanceMode || false;
};

export const useOrgFeatures = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.features || [];
};

export const useOrgTestimonials = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.testimonials || [];
};

export const useOrgFAQ = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.faq || [];
};

export const useOrgSocialLinks = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  return config?.socialLinks || {};
};

export const useOrgCurrency = () => {
  const config = useOrganizationConfigStore((state) => state.config);
  const normalized = config?.currency?.trim().toUpperCase();

  if (normalized === "TND" || normalized === "USD" || normalized === "EUR") {
    return normalized;
  }

  return "TND";
};

export const useOrgPaymentMode = (): 'free' | 'per_course' => {
  const config = useOrganizationConfigStore((state) => state.config);
  const mode = (config as any)?.paymentMode;
  if (mode === 'free' || mode === 'per_course') {
    return mode;
  }
  return 'per_course';
};

export const useOrgSubscriptionPrice = (): number => {
  const config = useOrganizationConfigStore((state) => state.config);
  return (config as any)?.subscriptionPrice || 0;
};
