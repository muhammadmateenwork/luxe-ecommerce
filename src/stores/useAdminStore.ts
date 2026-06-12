import { create } from 'zustand';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { useCategoryStore } from '@/stores/useCategoryStore';

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  monthlySales: { month: string; sales: number; orders: number }[];
  topProducts: any[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AdminState {
  stats: AdminStats | null;
  users: any[];
  orders: any[];
  products: any[];
  reviews: any[];
  categories: any[];
  coupons: any[];
  isLoading: boolean;
  error: string | null;
  activeTab: string;
  pagination: {
    users: Pagination | null;
    orders: Pagination | null;
    products: Pagination | null;
    reviews: Pagination | null;
    coupons: Pagination | null;
  };
  fetchStats: () => Promise<void>;
  fetchUsers: (page?: number, search?: string) => Promise<void>;
  fetchOrders: (page?: number, status?: string) => Promise<void>;
  fetchProducts: (page?: number, search?: string) => Promise<void>;
  fetchReviews: (page?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCoupons: (page?: number) => Promise<void>;
  setActiveTab: (tab: string) => void;
  deleteUser: (id: string) => Promise<void>;
  toggleBlockUser: (id: string, isBlocked: boolean) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  addCategory: (data: Record<string, unknown>) => Promise<void>;
  updateCategory: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCoupon: (data: Record<string, unknown>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  users: [],
  orders: [],
  products: [],
  reviews: [],
  categories: [],
  coupons: [],
  isLoading: false,
  error: null,
  activeTab: 'dashboard',
  pagination: {
    users: null,
    orders: null,
    products: null,
    reviews: null,
    coupons: null,
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/admin/stats'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      set({ stats: data.data, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stats';
      set({ isLoading: false, error: message });
    }
  },

  fetchUsers: async (page = 1, search?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);

      const res = await fetch(apiUrl(`/api/admin/users?${params}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      set((state) => ({
        users: data.data.users,
        pagination: { ...state.pagination, users: data.data.pagination },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      set({ isLoading: false, error: message });
    }
  },

  fetchOrders: async (page = 1, status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);

      const res = await fetch(apiUrl(`/api/admin/orders?${params}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      set((state) => ({
        orders: data.data.orders,
        pagination: { ...state.pagination, orders: data.data.pagination },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orders';
      set({ isLoading: false, error: message });
    }
  },

  fetchProducts: async (page = 1, search?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);

      const res = await fetch(apiUrl(`/api/admin/products?${params}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      set((state) => ({
        products: data.data.products,
        pagination: { ...state.pagination, products: data.data.pagination },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch products';
      set({ isLoading: false, error: message });
    }
  },

  fetchReviews: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });

      const res = await fetch(apiUrl(`/api/admin/reviews?${params}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      set((state) => ({
        reviews: data.data.reviews,
        pagination: { ...state.pagination, reviews: data.data.pagination },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch reviews';
      set({ isLoading: false, error: message });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/categories'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch categories');
      }

      set({ categories: data.data, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      set({ isLoading: false, error: message });
    }
  },

  fetchCoupons: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });

      const res = await fetch(apiUrl(`/api/coupons?${params}`), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch coupons');
      }

      set((state) => ({
        coupons: data.data.coupons,
        pagination: { ...state.pagination, coupons: data.data.pagination },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch coupons';
      set({ isLoading: false, error: message });
    }
  },

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  deleteUser: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      await get().fetchUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  toggleBlockUser: async (id: string, isBlocked: boolean) => {
    set({ isLoading: true, error: null });
    try {
      void isBlocked;

      const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle user block');
      }

      await get().fetchUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle user block';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/products/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete product');
      }

      await get().fetchProducts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  deleteOrder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/orders/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete order');
      }

      await get().fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete order';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateOrderStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/orders/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      await get().fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  deleteReview: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/admin/reviews/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete review');
      }

      await get().fetchReviews();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete review';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  addCategory: async (categoryData: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/categories'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add category');
      }

      await get().fetchCategories();
      // Refresh the global category store so navbar/footer update
      useCategoryStore.getState().refreshCategories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add category';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateCategory: async (id: string, categoryData: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/categories/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update category');
      }

      await get().fetchCategories();
      // Refresh the global category store so navbar/footer update
      useCategoryStore.getState().refreshCategories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/categories/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete category');
      }

      await Promise.all([
        get().fetchCategories(),
        get().fetchProducts(),
      ]);
      // Refresh the global category store so navbar/footer update
      useCategoryStore.getState().refreshCategories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  addCoupon: async (couponData: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/coupons'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(couponData),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add coupon');
      }

      await get().fetchCoupons();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add coupon';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  deleteCoupon: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl(`/api/coupons/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete coupon');
      }

      await get().fetchCoupons();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete coupon';
      set({ isLoading: false, error: message });
      throw error;
    }
  },
}));
