"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import apiClient from "@/lib/api/client";

// File Upload Hooks (Admin)
export const useGenerateSignedUrl = () => {
  return useMutation({
    mutationFn: (data: {
      fileName: string;
      fileType: string;
      fileSize: number;
      folder: string;
    }) =>
      apiClient.post("/admin/upload/signed-url", data).then((res) => res.data),
  });
};

export const useDirectUpload = () => {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient
        .post("/admin/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((res) => res.data),
  });
};

// File Upload Hooks (Client/Student)
export const useClientGenerateSignedUrl = () => {
  return useMutation({
    mutationFn: (data: {
      fileName: string;
      fileType: string;
      fileSize: number;
      folder: string;
    }) => api.generateSignedUrl(data).then((res) => res.data),
  });
};

export const useClientDirectUpload = () => {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.directUpload(formData).then((res) => res.data),
  });
};

