export const VALID_GENDERS = ["Male", "Female", "Other"] as const;

export const MAX_PHONE_LENGTH = 10;
export const MAX_PINCODE_LENGTH = 6;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const PHONE_VALIDATION = {
  REQUIRED_LENGTH: 10,
  ERROR_MESSAGES: {
    INVALID_LENGTH: "Phone number must be exactly 10 digits",
    MAX_DIGITS: "Phone number must be maximum 10 digits",
    MIN_DIGITS: "Phone number must be 10 digits",
  },
} as const;

export const IMAGE_VALIDATION = {
  MAX_SIZE: MAX_IMAGE_SIZE,
  ALLOWED_TYPES: ["image/"],
  ERROR_MESSAGES: {
    INVALID_TYPE: "Please select an image file",
    TOO_LARGE: "Image size should be less than 5MB",
  },
} as const;

