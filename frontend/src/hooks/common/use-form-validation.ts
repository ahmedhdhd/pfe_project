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

export interface FormField {
  value: string;
  error: string;
  isValid: boolean;
  touched: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Hook for form validation with real-time feedback
 */
export const useFormValidation = (
  initialFields: Record<string, string> = {},
  options: UseFormValidationOptions = {}
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
      };
    });
    return state;
  });

  const [isValidating, setIsValidating] = useState(false);

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

      setIsValidating(true);

      // Debounce validation
      setTimeout(() => {
        const validation = validateField(fieldName, field.value);

        setFormState((prev) => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            isValid: validation.isValid,
            error: validation.error || "",
          },
        }));

        setIsValidating(false);
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
      };

      if (!validation.isValid) {
        allValid = false;
      }
    });

    setFormState(newState);
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
        };
      });
      return newState;
    });
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
      return formState[fieldName]?.error || "";
    },
    [formState]
  );

  const isFieldValid = useCallback(
    (fieldName: string) => {
      return formState[fieldName]?.isValid ?? true;
    },
    [formState]
  );

  const isFormValid = Object.values(formState).every((field) => field.isValid);

  return {
    formState,
    isValidating,
    isFormValid,
    updateField,
    validateFieldOnBlur,
    validateAllFields,
    resetForm,
    setFieldError,
    clearFieldError,
    getFieldValue,
    getFieldError,
    isFieldValid,
  };
};
