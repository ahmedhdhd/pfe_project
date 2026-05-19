/**
 * Development-specific configuration for TeslaAcademy LMS
 * This file contains settings that are only used in development mode
 */

export const DEVELOPMENT_CONFIG = {
  // Enable localhost authentication
  ALLOW_LOCALHOST_AUTH: true,

  // Development domains that are allowed for authentication
  ALLOWED_DEV_DOMAINS: ["localhost", "127.0.0.1", "0.0.0.0"],

  // Mock client data for development
  MOCK_CLIENTS: {
    mit: {
      id: "mit",
      name: "MIT",
      domain: "mit.teslaacademy.in",
      subdomain: "mit",
      logo: "/images/mit-logo.png",
      primaryColor: "#DC2626",
      secondaryColor: "#991B1B",
      theme: "dark" as const,
      isActive: true,
      settings: {
        allowSelfRegistration: false,
        maxUsers: 5000,
        features: ["analytics", "custom_branding"],
        customBranding: true,
        customDomain: true,
        analytics: true,
        apiAccess: false,
      },
    },
    stanford: {
      id: "stanford",
      name: "Stanford University",
      domain: "stanford.teslaacademy.in",
      subdomain: "stanford",
      logo: "/images/stanford-logo.png",
      primaryColor: "#8B5CF6",
      secondaryColor: "#7C3AED",
      theme: "light" as const,
      isActive: true,
      settings: {
        allowSelfRegistration: true,
        maxUsers: 10000,
        features: ["analytics", "custom_branding", "api_access"],
        customBranding: true,
        customDomain: true,
        analytics: true,
        apiAccess: true,
      },
    },
  },

  // Development URLs for testing
  DEV_URLS: {
    MAIN_DOMAIN: "http://localhost:3000",
    SUBDOMAIN_SIMULATION: "http://localhost:3000/?subdomain=mit",
    TEST_SUBDOMAIN: "http://localhost:3000/test-subdomain",
  },

  // Demo credentials for development testing
  DEMO_CREDENTIALS: {
    admin: {
      email: "admin@example.com",
      password: "password",
      role: "admin" as const,
    },
    teacher: {
      email: "teacher@example.com",
      password: "password",
      role: "teacher" as const,
    },
    student: {
      email: "student@example.com",
      password: "password",
      role: "student" as const,
    },
  },

  // Development features
  FEATURES: {
    ENABLE_DEBUG_LOGGING: true,
    ENABLE_MOCK_DATA: true,
    ENABLE_DEV_TOOLS: true,
    ENABLE_HOT_RELOAD: true,
  },
} as const;

/**
 * Check if the current environment is development
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === "development";
};

/**
 * Check if the current hostname is allowed for development
 */
export const isAllowedDevDomain = (hostname: string): boolean => {
  return DEVELOPMENT_CONFIG.ALLOWED_DEV_DOMAINS.includes(
    hostname as "localhost" | "127.0.0.1" | "0.0.0.0"
  );
};

/**
 * Get development configuration
 */
export const getDevConfig = () => {
  return DEVELOPMENT_CONFIG;
};
