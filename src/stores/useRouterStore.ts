import { create } from 'zustand';

type PageName =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'account'
  | 'auth'
  | 'admin'
  | 'wishlist'
  | 'order-confirmation'
  | 'contact'
  | 'shipping'
  | 'faq'
  | 'size-guide'
  | 'track-order'
  | 'gift-cards'
  | 'about';

interface HistoryEntry {
  page: string;
  params: Record<string, string>;
}

interface RouterState {
  page: string;
  params: Record<string, string>;
  history: HistoryEntry[];
  navigate: (page: string, params?: Record<string, string>) => void;
  goBack: () => void;
}

function parseHash(): { page: string; params: Record<string, string> } {
  if (typeof window === 'undefined') {
    return { page: 'home', params: {} };
  }

  const hash = window.location.hash.slice(1); // Remove the '#'
  if (!hash) {
    return { page: 'home', params: {} };
  }

  const parts = hash.split('/');
  const page = parts[0] || 'home';
  const params: Record<string, string> = {};

  // Parse params from hash format: #page/param1/value1/param2/value2
  // Or for simple ID-based routes: #product/123
  if (parts.length >= 2) {
    // Handle routes with a single ID parameter like #product/123
    const idRoutes = ['product', 'order-confirmation'];
    if (idRoutes.includes(page) && parts.length === 2) {
      params.id = parts[1];
    } else {
      // Parse key/value pairs: #page/key1/value1/key2/value2
      for (let i = 1; i < parts.length - 1; i += 2) {
        params[parts[i]] = parts[i + 1];
      }
    }
  }

  return { page, params };
}

function buildHash(page: string, params?: Record<string, string>): string {
  let hash = page;

  if (params) {
    const entries = Object.entries(params);
    if (entries.length === 1 && entries[0][0] === 'id') {
      // Simple ID-based route: #product/123
      hash += `/${entries[0][1]}`;
    } else if (entries.length > 0) {
      // Key/value pairs: #shop/category/dresses/sort/price
      for (const [key, value] of entries) {
        hash += `/${key}/${value}`;
      }
    }
  }

  return hash;
}

// Initialize from current hash
const initialState = parseHash();

export const useRouterStore = create<RouterState>((set, get) => ({
  page: initialState.page,
  params: initialState.params,
  history: [{ page: initialState.page, params: initialState.params }],

  navigate: (page: string, params: Record<string, string> = {}) => {
    const { history } = get();

    // Update the hash for bookmarkability
    if (typeof window !== 'undefined') {
      const hash = buildHash(page, params);
      window.location.hash = hash;
    }

    set({
      page,
      params,
      history: [...history, { page, params }],
    });
  },

  goBack: () => {
    const { history } = get();

    if (history.length <= 1) {
      return;
    }

    const newHistory = history.slice(0, -1);
    const previous = newHistory[newHistory.length - 1];

    // Update the hash
    if (typeof window !== 'undefined') {
      const hash = buildHash(previous.page, previous.params);
      window.location.hash = hash;
    }

    set({
      page: previous.page,
      params: previous.params,
      history: newHistory,
    });
  },
}));

// Listen for hash changes (browser back/forward buttons)
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const { page, params } = parseHash();
    const currentState = useRouterStore.getState();

    // Only update if the hash actually changed to a different page/params
    if (currentState.page !== page || JSON.stringify(currentState.params) !== JSON.stringify(params)) {
      useRouterStore.setState({
        page,
        params,
        history: [...currentState.history, { page, params }],
      });
    }
  });
}

// Export type for use in components
export type { PageName, HistoryEntry };
