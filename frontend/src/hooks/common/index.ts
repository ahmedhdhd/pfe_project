/**
 * Common hooks exports
 */

export { useFormValidation } from "./use-form-validation";
export type {
  FormField,
  FormState,
  UseFormValidationOptions,
} from "./use-form-validation";

export { useEnhancedFormValidation } from "./use-enhanced-form-validation";
export type {
  EnhancedFormField,
  UseEnhancedFormValidationOptions,
} from "./use-enhanced-form-validation";

export { useLoadingState } from "./use-loading-state";
export type { LoadingState, UseLoadingStateOptions } from "./use-loading-state";

export { useAsyncOperation, useApiMutation } from "./use-async-operation";
export type { AsyncOperationOptions } from "./use-async-operation";

export { useDebounce, useDebouncedCallback } from "./use-debounce";

export { useRolePermissions } from "./use-role-permissions";
export type { RolePermissions } from "./use-role-permissions";

export { useIsMobile } from "./use-is-mobile";
