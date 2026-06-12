import { create } from 'zustand';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count?: { products: number };
}

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  fetchCategories: (force?: boolean) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  fetchCategories: async (force = false) => {
    // Don't refetch if already loaded (unless forced)
    if (!force && get().categories.length > 0 && !get().isLoading) return;
    if (get().isLoading) return; // Prevent concurrent fetches
    set({ isLoading: true });
    try {
      const res = await fetch(apiUrl('/api/categories'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        set({ categories: data.data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refreshCategories: async () => {
    // Force refresh - always refetches from API
    set({ isLoading: true });
    try {
      const res = await fetch(apiUrl('/api/categories'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        set({ categories: data.data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
