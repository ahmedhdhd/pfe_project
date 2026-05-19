import { api } from "@/lib/api/client";
import { useMutation } from "@tanstack/react-query";

// Organization creation hook
export const useCreateOrganization = () => {
  return useMutation({
    mutationFn: (data: { name: string; subdomain: string }) => {
      return api
        .createOrganization({
          name: data.name,
          slug: data.subdomain,
        })
        .then((res: { data: unknown }) => res.data);
    },
    onError: (error) => {
      console.error("Failed to create organization:", error);
    },
  });
};

// Admin registration hook
export const useRegisterAdmin = () => {
  return useMutation({
    mutationFn: (data: {
      email: string;
      username: string;
      organizationId: string;
    }) => api.register(data).then((res: { data: unknown }) => res.data),
    onError: (error) => {
      console.error("Failed to register admin:", error);
    },
  });
};

// Email verification hook
export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      api.verifyEmail(data).then((res: { data: unknown }) => res.data),
    onError: (error) => {
      console.error("Failed to verify email:", error);
    },
  });
};

// Password setup hook
export const useSetPassword = () => {
  return useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      api.setPassword(data).then((res: { data: unknown }) => res.data),
    onError: (error) => {
      console.error("Failed to set password:", error);
    },
  });
};
