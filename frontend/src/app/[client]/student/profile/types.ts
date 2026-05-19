import { Profile } from "@/hooks/api";

export type Gender = "Male" | "Female" | "Other";

export interface ProfileFormData {
  username: string;
  profileImg: string;
  gender: Gender | "";
  phoneNumber: string;
  address: {
    city: string;
    state: string;
    pincode: string;
  };
}

export interface ProfileUpdateData {
  username?: string;
  profileImg?: string;
  gender?: Gender;
  phoneNumber?: string;
  address?: {
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface ProfileFormProps {
  formData: ProfileFormData;
  isEditing: boolean;
  onInputChange: (field: string, value: string) => void;
  phoneError?: string;
}
