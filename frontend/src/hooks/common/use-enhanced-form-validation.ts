"use client";

import { useState, useCallback } from "react";
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  validateOrganizationName,
  ValidationResult,
} from "@/lib/utils/validation";

export interface EnhancedFormField extends FormField {
  isValidating: boolean;
  hasBeenTouched: boolean;
}

export interface FormField {
  value: string;
  error: string;
  isValid: boolean;
  touched: boolean;
}

export interface FormState {
  [key: string]: EnhancedFormField;
}

export interface UseEnhancedFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Enhanced form validation hook with better UX
 */
export const useEnhancedFormValidation = (
  initialFields: Record<string, string> = {},
  options: UseEnhancedFormValidationOptions = {}
) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
  } = options;

  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(initialFields).forEach((key) => {
      state[key] = {
        value: initialFields[key] || "",
        error: "",
        isValid: true,
        touched: false,
        isValidating: false,
        hasBeenTouched: false,
      };
    });
    return state;
  });

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validateField = useCallback(
    (fieldName: string, value: string): ValidationResult => {
      switch (fieldName) {
        case "email":
          return validateEmail(value);
        case "username":
          return validateUsername(value);
        case "password":
          return validatePassword(value);
        case "confirmPassword":
          return validateConfirmPassword(
            formState.password?.value || "",
            value
          );
        case "organizationName":
          return validateOrganizationName(value);
        default:
          return { isValid: true };
      }
    },
    [formState.password?.value]
  );

  const updateField = useCallback(
    (fieldName: string, value: string, shouldValidate = true) => {
      setFormState((prev) => {
        const newState = { ...prev };
        const field = { ...newState[fieldName] };

        field.value = value;
        field.touched = true;
        field.hasBeenTouched = true;

        if (shouldValidate && validateOnChange) {
          const validation = validateField(fieldName, value);
          field.isValid = validation.isValid;
          field.error = validation.error || "";
        }

        newState[fieldName] = field;
        return newState;
      });
    },
    [validateField, validateOnChange]
  );

  const validateFieldOnBlur = useCallback(
    (fieldName: string) => {
      if (!validateOnBlur) return;

      const field = formState[fieldName];
      if (!field) return;

      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValidating: true,
        },
      }));

      // Debounce validation
      setTimeout(() => {
        const validation = validateField(fieldName, field.value);

        setFormState((prev) => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            isValid: validation.isValid,
            error: validation.error || "",
            isValidating: false,
          },
        }));
      }, debounceMs);
    },
    [formState, validateField, validateOnBlur, debounceMs]
  );

  const validateAllFields = useCallback((): boolean => {
    let allValid = true;
    const newState = { ...formState };

    Object.keys(formState).forEach((fieldName) => {
      const field = formState[fieldName];
      const validation = validateField(fieldName, field.value);

      newState[fieldName] = {
        ...field,
        isValid: validation.isValid,
        error: validation.error || "",
        touched: true,
        hasBeenTouched: true,
      };

      if (!validation.isValid) {
        allValid = false;
      }
    });

    setFormState(newState);
    setHasSubmitted(true);
    return allValid;
  }, [formState, validateField]);

  const resetForm = useCallback(() => {
    setFormState((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        newState[key] = {
          ...newState[key],
          value: initialFields[key] || "",
          error: "",
          isValid: true,
          touched: false,
          isValidating: false,
          hasBeenTouched: false,
        };
      });
      return newState;
    });
    setHasSubmitted(false);
  }, [initialFields]);

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setFormState((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        error,
        isValid: false,
      },
    }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFormState((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        error: "",
        isValid: true,
      },
    }));
  }, []);

  const getFieldValue = useCallback(
    (fieldName: string) => {
      return formState[fieldName]?.value || "";
    },
    [formState]
  );

  const getFieldError = useCallback(
    (fieldName: string) => {
      const field = formState[fieldName];
      if (!field) return "";

      // Show error if field has been touched or form has been submitted
      if (field.hasBeenTouched || hasSubmitted) {
        return field.error;
      }
      return "";
    },
    [formState, hasSubmitted]
  );

  const isFieldValid = useCallback(
    (fieldName: string) => {
      return formState[fieldName]?.isValid ?? true;
    },
    [formState]
  );

  const isFieldValidating = useCallback(
    (fieldName: string) => {
      return formState[fieldName]?.isValidating ?? false;
    },
    [formState]
  );

  const hasFieldBeenTouched = useCallback(
    (fieldName: string) => {
      return formState[fieldName]?.hasBeenTouched ?? false;
    },
    [formState]
  );

  const isFormValid = Object.values(formState).every((field) => field.isValid);
  const isFormTouched = Object.values(formState).some(
    (field) => field.hasBeenTouched
  );

  return {
    formState,
    hasSubmitted,
    isFormValid,
    isFormTouched,
    updateField,
    validateFieldOnBlur,
    validateAllFields,
    resetForm,
    setFieldError,
    clearFieldError,
    getFieldValue,
    getFieldError,
    isFieldValid,
    isFieldValidating,
    hasFieldBeenTouched,
  };
};
