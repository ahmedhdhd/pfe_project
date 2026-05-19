/**
 * Common validation utilities for forms and inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { isValid: false, error: "Email is required" };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
};

/**
 * Username validation
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { isValid: false, error: "Username must be at least 3 characters" };
  }

  if (username.length > 20) {
    return {
      isValid: false,
      error: "Username must be less than 20 characters",
    };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }

  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  return { isValid: true };
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }

  return { isValid: true };
};

/**
 * Calculate password strength
 */
export const calculatePasswordStrength = (
  password: string
): PasswordStrength => {
  let score = 0;

  if (password.length >= 8) score += 25;
  if (/[a-z]/.test(password)) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;

  const finalScore = Math.min(score, 100);

  if (finalScore < 25) {
    return { score: finalScore, label: "Very Weak", color: "text-red-500" };
  } else if (finalScore < 50) {
    return { score: finalScore, label: "Weak", color: "text-orange-500" };
  } else if (finalScore < 75) {
    return { score: finalScore, label: "Good", color: "text-yellow-500" };
  } else {
    return { score: finalScore, label: "Strong", color: "text-green-500" };
  }
};

/**
 * Organization name validation
 */
export const validateOrganizationName = (name: string): ValidationResult => {
  if (!name) {
    return { isValid: false, error: "Organization name is required" };
  }

  if (name.length < 3) {
    return {
      isValid: false,
      error: "Organization name must be at least 3 characters",
    };
  }

  if (name.length > 50) {
    return {
      isValid: false,
      error: "Organization name must be less than 50 characters",
    };
  }

  return { isValid: true };
};

/**
 * Generate subdomain from organization name
 */
export const generateSubdomain = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/**
 * Generic form validation helper
 */
export const validateForm = (
  fields: Record<string, unknown>,
  validators: Record<string, (value: unknown) => ValidationResult>
) => {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [field, value] of Object.entries(fields)) {
    if (validators[field]) {
      const result = validators[field](value);
      if (!result.isValid) {
        errors[field] = result.error || "";
        isValid = false;
      }
    }
  }

  return { isValid, errors };
};
