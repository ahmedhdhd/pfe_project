"use client";

import { useState, useEffect, useCallback } from "react";
import { Profile } from "@/hooks/api";
import type { Gender, ProfileFormData } from "../types";
import { VALID_GENDERS, MAX_PHONE_LENGTH } from "../constants";
import type { ProfileUpdateData } from "../types";

interface UseProfileFormOptions {
  profile: Profile | undefined;
  onUpdate: (data: ProfileUpdateData) => Promise<void>;
}

interface UseProfileFormReturn {
  formData: ProfileFormData;
  isEditing: boolean;
  hasChanges: boolean;
  phoneError: string;
  setIsEditing: (editing: boolean) => void;
  handleInputChange: (field: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
  resetForm: () => void;
}

export function useProfileForm({
  profile,
  onUpdate,
}: UseProfileFormOptions): UseProfileFormReturn {
  const [formData, setFormData] = useState<ProfileFormData>({
    username: "",
    profileImg: "",
    gender: "",
    phoneNumber: "",
    address: {
      city: "",
      state: "",
      pincode: "",
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const genderValue = normalizeGender(profile.gender);
      const initialData: ProfileFormData = {
        username: profile.username || "",
        profileImg: profile.profileImg || "",
        gender: genderValue,
        phoneNumber: profile.phoneNumber || "",
        address: {
          city: profile.address?.city || "",
          state: profile.address?.state || "",
          pincode: profile.address?.pincode || "",
        },
      };
      setFormData(initialData);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const hasFormChanges =
        formData.username !== (profile.username || "") ||
        formData.profileImg !== (profile.profileImg || "") ||
        formData.gender !== normalizeGender(profile.gender) ||
        formData.phoneNumber !== (profile.phoneNumber || "") ||
        formData.address.city !== (profile.address?.city || "") ||
        formData.address.state !== (profile.address?.state || "") ||
        formData.address.pincode !== (profile.address?.pincode || "");

      setHasChanges(hasFormChanges);
    }
  }, [formData, profile]);

  const normalizeGender = useCallback(
    (gender?: Gender | string): Gender | "" => {
      if (!gender) return "";
      const genderLower = String(gender).trim().toLowerCase();
      const matchedGender = VALID_GENDERS.find(
        (g) => g.toLowerCase() === genderLower
      );
      return matchedGender || "";
    },
    []
  );

  const validatePhoneNumber = useCallback((value: string): string => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length > MAX_PHONE_LENGTH) {
      return "Phone number must be maximum 10 digits";
    }
    if (digitsOnly.length > 0 && digitsOnly.length < MAX_PHONE_LENGTH) {
      return "Phone number must be 10 digits";
    }
    return "";
  }, []);

  const handleInputChange = useCallback(
    (field: string, value: string) => {
      // Validate phone number
      if (field === "phoneNumber") {
        const digitsOnly = value.replace(/\D/g, "");
        const limitedValue = digitsOnly.slice(0, MAX_PHONE_LENGTH);
        const error = validatePhoneNumber(limitedValue);
        setPhoneError(error);
        value = limitedValue;
      }

      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof typeof prev] as Record<string, unknown>),
            [child]: value,
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      }
    },
    [validatePhoneNumber]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate phone number before submit
      if (formData.phoneNumber && formData.phoneNumber.trim() !== "") {
        if (formData.phoneNumber.length !== MAX_PHONE_LENGTH) {
          setPhoneError("Phone number must be exactly 10 digits");
          return;
        }
      }

      if (!hasChanges) {
        return;
      }

      const updateData: ProfileUpdateData = {};

      if (profile) {
        if (formData.username !== (profile.username || "")) {
          updateData.username = formData.username;
        }
        if (formData.profileImg !== (profile.profileImg || "")) {
          updateData.profileImg = formData.profileImg;
        }
        const normalizedProfileGender = normalizeGender(profile.gender);
        if (formData.gender !== normalizedProfileGender && formData.gender) {
          updateData.gender = formData.gender as Gender;
        }
        if (formData.phoneNumber !== (profile.phoneNumber || "")) {
          updateData.phoneNumber = formData.phoneNumber;
        }
        if (
          formData.address.city !== (profile.address?.city || "") ||
          formData.address.state !== (profile.address?.state || "") ||
          formData.address.pincode !== (profile.address?.pincode || "")
        ) {
          updateData.address = formData.address;
        }
      }

      await onUpdate(updateData);
      setIsEditing(false);
    },
    [formData, hasChanges, profile, normalizeGender, onUpdate]
  );

  const handleCancel = useCallback(() => {
    resetForm();
    setPhoneError("");
    setIsEditing(false);
  }, []);

  const resetForm = useCallback(() => {
    if (profile) {
      const genderValue = normalizeGender(profile.gender);
      setFormData({
        username: profile.username || "",
        profileImg: profile.profileImg || "",
        gender: genderValue,
        phoneNumber: profile.phoneNumber || "",
        address: {
          city: profile.address?.city || "",
          state: profile.address?.state || "",
          pincode: profile.address?.pincode || "",
        },
      });
    }
  }, [profile, normalizeGender]);

  return {
    formData,
    isEditing,
    hasChanges,
    phoneError,
    setIsEditing,
    handleInputChange,
    handleSubmit,
    handleCancel,
    resetForm,
  };
}
