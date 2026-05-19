"use client";

import { useCallback } from "react";
import { useClientDirectUpload, useUpdateProfile } from "@/hooks/api";
import { toast } from "sonner";
import type { ProfileUpdateData } from "../types";

export function useProfileImageUpload() {
  const clientUpload = useClientDirectUpload();
  const updateProfile = useUpdateProfile();

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await clientUpload.mutateAsync(formData);

        if (result.success && result.data) {
          const imageUrl = result.data.url;

          // Automatically update profile with the new image URL
          try {
            await updateProfile.mutateAsync({
              profileImg: imageUrl,
            } as ProfileUpdateData);
            toast.success("Profile image updated successfully!");
            return imageUrl;
          } catch (updateError) {
            // Image uploaded but profile update failed
            toast.error("Image uploaded but failed to update profile");
            return null;
          }
        } else {
          toast.error("Failed to upload image");
          return null;
        }
      } catch (error: unknown) {
        const errorMessage =
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data &&
          typeof error.response.data.message === "string"
            ? error.response.data.message
            : "Failed to upload image";
        toast.error(errorMessage);
        return null;
      }
    },
    [clientUpload, updateProfile]
  );

  return {
    handleImageUpload,
    isUploading: clientUpload.isPending,
  };
}
