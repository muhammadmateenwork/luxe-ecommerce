import { create } from 'zustand';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  images: string[];
  stock: number;
  brand: string | null;
}

interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number, size?: string, color?: string) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/cart'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch cart');
      }

      set({ items: data.data, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cart';
      set({ isLoading: false, error: message });
    }
  },

  addItem: async (productId: string, quantity: number, size?: string, color?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/cart'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity, size, color }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add item to cart');
      }

      await get().fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item to cart';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateItem: async (id: string, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/cart/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update cart item');
      }

      await get().fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cart item';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  removeItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/cart/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove cart item');
      }

      await get().fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove cart item';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearCart: () => {
    set({ items: [], error: null });
  },

  getTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      const price = item.product.salePrice ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));
