// API Client for LUXE E-Commerce
// All API calls go through the Next.js API proxy which forwards to the Express backend

export function apiUrl(path: string): string {
  // API calls go through Next.js proxy - no XTransformPort needed
  return path;
}

// Get the auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('luxe_token');
}

// Convenience fetch wrapper that includes auth token
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  const token = getAuthToken();

  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  return fetch(url, fetchOptions);
}

// Get auth headers for use in stores
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export default apiUrl;
