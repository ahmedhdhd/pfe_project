"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { Client } from "@/lib/types/client";
import { useOrganizationConfig } from "@/hooks/api";
import { OrganizationConfig } from "@/lib/types/api";
import { extractOrganizationSlug } from "@/lib/utils/organization";

// Helper function to map OrganizationConfig to Client interface
const mapOrganizationConfigToClient = (
  config: OrganizationConfig,
  subdomain: string
): Client => {
  return {
    id: config.id,
    organizationId: config.organizationId,
    name: config.name,
    domain: config.domain!,
    subdomain: subdomain,
    basePath: "teslaacademy",
    logo: config.logoUrl!,
    primaryColor:
      ((config.theme as Record<string, unknown>)?.primaryColor as string) ||
      "#3b82f6",
    secondaryColor:
      ((config.theme as Record<string, unknown>)?.secondaryColor as string) ||
      "#1e40af",
    theme: "light", // Default theme, can be enhanced based on config
    isActive: !config.maintenanceMode,
    createdAt: new Date().toISOString(), // API doesn't provide this, using current time
    settings: {
      allowSelfRegistration:
        ((config.featuresEnabled as Record<string, unknown>)
          ?.selfRegistration as boolean) || true,
      maxUsers: 1000, // Default value, can be configured
      features: Object.keys(config.featuresEnabled || {}),
      customBranding: true,
      customDomain: !!config.domain,
      analytics:
        ((config.featuresEnabled as Record<string, unknown>)
          ?.analytics as boolean) || false,
      apiAccess:
        ((config.featuresEnabled as Record<string, unknown>)
          ?.apiAccess as boolean) || false,
      theme: {
        primaryColor:
          ((config.theme as Record<string, unknown>)?.primaryColor as string) ||
          "#3b82f6",
        secondaryColor:
          ((config.theme as Record<string, unknown>)
            ?.secondaryColor as string) || "#1e40af",
      },
    },
  };
};

interface ClientContextType {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

interface ClientProviderProps {
  children: ReactNode;
  domain?: string;
  subdomain?: string;
}

export function ClientProvider({
  children,
  domain,
  subdomain,
}: ClientProviderProps) {
  const [detectedSubdomain, setDetectedSubdomain] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Auto-detect subdomain from hostname if not provided
    if (!subdomain) {
      const detectedSlug = extractOrganizationSlug();
      if (detectedSlug) {
        setDetectedSubdomain(detectedSlug);
      }
    }
  }, [subdomain]);

  const finalSubdomain = subdomain || detectedSubdomain;

  // Use the organization config hook
  const {
    data: orgConfigData,
    isLoading,
    error: orgConfigError,
  } = useOrganizationConfig(finalSubdomain || "");

  // Convert organization config to client format
  const client =
    orgConfigData?.success && orgConfigData.data
      ? mapOrganizationConfigToClient(orgConfigData.data, finalSubdomain || "")
      : null;

  // Handle different error scenarios
  const error = orgConfigError
    ? `Failed to load organization configuration${
        finalSubdomain ? ` for ${finalSubdomain}` : ""
      }`
    : !finalSubdomain && !domain
    ? "No organization slug or domain provided"
    : null;

  // Inject tenant-based theming
  useEffect(() => {
    if (client?.settings.theme && typeof window !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty(
        "--tenant-primary",
        client.settings.theme.primaryColor
      );
      root.style.setProperty(
        "--tenant-secondary",
        client.settings.theme.secondaryColor
      );
    }
  }, [client]);

  return (
    <ClientContext.Provider
      value={{ client: client || null, isLoading, error: error || null }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
