import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StudentCourseCartItem {
  id: string;
  title: string;
  imageUrl?: string;
  category?: string | null;
  language?: string | null;
  totalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  addedAt: string;
}

interface StudentCourseCartState {
  items: StudentCourseCartItem[];
  addItem: (item: Omit<StudentCourseCartItem, "addedAt">) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
  clearCart: () => void;
  hasItem: (id: string) => boolean;
}

export const useStudentCourseCartStore = create<StudentCourseCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === item.id);
          if (existing) {
            return state;
          }

          return {
            items: [
              ...state.items,
              {
                ...item,
                addedAt: new Date().toISOString(),
              },
            ],
          };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      removeItems: (ids) =>
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
        })),
      clearCart: () => set({ items: [] }),
      hasItem: (id) => get().items.some((item) => item.id === id),
    }),
    {
      name: "student-course-cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export const useStudentCourseCartItems = () =>
  useStudentCourseCartStore((state) => state.items);

export const useStudentCourseCartCount = () =>
  useStudentCourseCartStore((state) => state.items.length);
