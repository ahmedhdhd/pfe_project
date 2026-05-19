import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StudentData {
  email: string;
  username: string;
  organizationId: string;
  id?: string;
}

export interface StudentAuthState {
  // Student data
  studentData: StudentData | null;
  setStudentData: (data: StudentData) => void;

  // User ID for password setup
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Email verification
  emailVerified: boolean;
  setEmailVerified: (verified: boolean) => void;

  // Password setup
  passwordSet: boolean;
  setPasswordSet: (value: boolean) => void;

  // Reset student auth data
  resetStudentAuth: () => void;

  // Complete student auth
  completeStudentAuth: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>()(
  persist(
    (set) => ({
      // Student data
      studentData: null,
      setStudentData: (data) => set({ studentData: data }),

      // User ID
      userId: null,
      setUserId: (id) => set({ userId: id }),

      // Email verification
      emailVerified: false,
      setEmailVerified: (verified) => set({ emailVerified: verified }),

      // Password setup
      passwordSet: false,
      setPasswordSet: (value) => set({ passwordSet: value }),

      // Reset student auth data
      resetStudentAuth: () =>
        set({
          studentData: null,
          userId: null,
          emailVerified: false,
          passwordSet: false,
        }),

      // Complete student auth
      completeStudentAuth: () => {
        // Clear student auth data after completion
        set({
          studentData: null,
          userId: null,
          emailVerified: false,
          passwordSet: false,
        });
      },
    }),
    {
      name: "student-auth-storage",
      partialize: (state) => ({
        studentData: state.studentData,
        userId: state.userId,
        emailVerified: state.emailVerified,
        passwordSet: state.passwordSet,
      }),
    }
  )
);

// Helper hooks
export const useStudentAuthProgress = () => {
  const { studentData, emailVerified, passwordSet } = useStudentAuthStore();

  return {
    totalSteps: 3,
    progress: (() => {
      let completedSteps = 0;
      if (studentData) completedSteps++;
      if (emailVerified) completedSteps++;
      if (passwordSet) completedSteps++;
      return (completedSteps / 3) * 100;
    })(),
    isStepComplete: (step: number) => {
      switch (step) {
        case 1:
          return !!studentData;
        case 2:
          return emailVerified;
        case 3:
          return passwordSet;
        default:
          return false;
      }
    },
    canProceedToStep: (step: number) => {
      switch (step) {
        case 1:
          return true;
        case 2:
          return !!studentData;
        case 3:
          return !!studentData && emailVerified;
        default:
          return false;
      }
    },
  };
};
