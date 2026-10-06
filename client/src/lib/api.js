import axios from 'axios';

export const TOKEN_KEY = 'sd_token';
export const TEMPLE_SCOPE_KEY = 'sd_temple_scope';

/** localStorage can throw (private mode, blocked storage), so every access is guarded. */
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const API_ORIGIN = import.meta.env.VITE_API_URL || '';

export const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((config) => {
  const token = storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Only superadmins use this header; the server ignores it for everyone else.
  const scope = storage.get(TEMPLE_SCOPE_KEY);
  if (scope) config.headers['X-Temple-Id'] = scope;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only a rejected session token logs the user out (not, say, a wrong password).
    if (error.response?.data?.error?.code === 'AUTH_INVALID' && storage.get(TOKEN_KEY)) {
      window.dispatchEvent(new Event('sd:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.code === 'ERR_NETWORK' || [502, 503, 504].includes(error?.response?.status)) {
    return 'Cannot reach the server. Is the API running?';
  }
  return error?.message || fallback;
}
