import { create } from 'zustand';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  images: string[];
  stock: number;
  brand: string | null;
  averageRating: number;
  totalReviews: number;
}

interface WishlistItem {
  id: string;
  productId: string;
  userId: string;
  product: WishlistProduct;
  createdAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  addItem: (productId: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWishlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/wishlist'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch wishlist');
      }

      set({ items: data.data, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch wishlist';
      set({ isLoading: false, error: message });
    }
  },

  addItem: async (productId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/wishlist'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add item to wishlist');
      }

      await get().fetchWishlist();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item to wishlist';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  removeItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/wishlist/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove wishlist item');
      }

      await get().fetchWishlist();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove wishlist item';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  isInWishlist: (productId: string) => {
    const { items } = get();
    return items.some((item) => item.productId === productId);
  },
}));
