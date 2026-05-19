/**
 * Development testing utilities for TeslaAcademy LMS
 * These utilities help with testing and development workflows
 */

import { DEVELOPMENT_CONFIG } from "../config/development";

/**
 * Test authentication with demo credentials
 */
export const testAuthentication = {
  /**
   * Get demo credentials for a specific role
   */
  getDemoCredentials: (role: "admin" | "teacher" | "student") => {
    return DEVELOPMENT_CONFIG.DEMO_CREDENTIALS[role];
  },

  /**
   * Get all demo credentials
   */
  getAllDemoCredentials: () => {
    return DEVELOPMENT_CONFIG.DEMO_CREDENTIALS;
  },

  /**
   * Check if current environment supports demo login
   */
  isDemoLoginEnabled: () => {
    return process.env.NODE_ENV === "development";
  },
};

/**
 * Test subdomain functionality
 */
export const testSubdomain = {
  /**
   * Get test subdomain URLs
   */
  getTestUrls: () => {
    return {
      mit: `${DEVELOPMENT_CONFIG.DEV_URLS.MAIN_DOMAIN}/?subdomain=mit`,
      stanford: `${DEVELOPMENT_CONFIG.DEV_URLS.MAIN_DOMAIN}/?subdomain=stanford`,
      testPage: DEVELOPMENT_CONFIG.DEV_URLS.TEST_SUBDOMAIN,
    };
  },

  /**
   * Get mock client data for testing
   */
  getMockClients: () => {
    return DEVELOPMENT_CONFIG.MOCK_CLIENTS;
  },

  /**
   * Check if subdomain is valid for testing
   */
  isValidSubdomain: (subdomain: string) => {
    return Object.keys(DEVELOPMENT_CONFIG.MOCK_CLIENTS).includes(subdomain);
  },
};

/**
 * Development debugging utilities
 */
export const debugUtils = {
  /**
   * Log development information
   */
  logDevInfo: () => {
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 TeslaAcademy LMS - Development Mode");
      console.log("📋 Available test URLs:");
      console.log("  - Main domain:", DEVELOPMENT_CONFIG.DEV_URLS.MAIN_DOMAIN);
      console.log("  - MIT subdomain:", testSubdomain.getTestUrls().mit);
      console.log(
        "  - Stanford subdomain:",
        testSubdomain.getTestUrls().stanford
      );
      console.log("  - Test page:", DEVELOPMENT_CONFIG.DEV_URLS.TEST_SUBDOMAIN);
      console.log("🔑 Demo credentials:");
      Object.entries(DEVELOPMENT_CONFIG.DEMO_CREDENTIALS).forEach(
        ([role, creds]) => {
          console.log(`  - ${role}: ${creds.email} / ${creds.password}`);
        }
      );
    }
  },

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled: () => {
    return DEVELOPMENT_CONFIG.FEATURES.ENABLE_DEBUG_LOGGING;
  },
};

/**
 * Development testing helpers
 */
export const devHelpers = {
  /**
   * Get all available test scenarios
   */
  getTestScenarios: () => {
    return {
      authentication: {
        admin: testAuthentication.getDemoCredentials("admin"),
        teacher: testAuthentication.getDemoCredentials("teacher"),
        student: testAuthentication.getDemoCredentials("student"),
      },
      subdomains: {
        mit: testSubdomain.getTestUrls().mit,
        stanford: testSubdomain.getTestUrls().stanford,
      },
      urls: DEVELOPMENT_CONFIG.DEV_URLS,
    };
  },

  /**
   * Run all development checks
   */
  runDevChecks: () => {
    const checks = {
      isDevelopment: process.env.NODE_ENV === "development",
      hasDemoCredentials:
        Object.keys(DEVELOPMENT_CONFIG.DEMO_CREDENTIALS).length > 0,
      hasMockClients: Object.keys(DEVELOPMENT_CONFIG.MOCK_CLIENTS).length > 0,
      debugLoggingEnabled: DEVELOPMENT_CONFIG.FEATURES.ENABLE_DEBUG_LOGGING,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Development Checks:", checks);
    }

    return checks;
  },
};

// Auto-run development checks in development mode
if (process.env.NODE_ENV === "development") {
  debugUtils.logDevInfo();
  devHelpers.runDevChecks();
}
