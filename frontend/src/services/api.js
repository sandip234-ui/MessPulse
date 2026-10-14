import axios from 'axios';

/**
 * Central Axios API Client
 * - Configurable baseURL via VITE_API_BASE_URL (defaults to '/api/v1' for Vite proxy in development)
 * - withCredentials: true ensures HTTP-only authentication cookies are transmitted securely
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// Response interceptor for centralized error extraction and safe error messaging
api.interceptors.response.use(
  (response) => {
    // Backend standard structure: { success: true, data: ..., message: ... }
    return response.data;
  },
  (error) => {
    // Handle Network / Connection Errors
    if (!error.response) {
      const networkError = new Error(
        'Backend service is currently unavailable. Please check your network connection.'
      );
      networkError.code = 'NETWORK_UNAVAILABLE';
      networkError.status = 0;
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;
    const errorData = data?.error;
    const serverMessage = errorData?.message || data?.message;
    const code = errorData?.code || 'API_ERROR';

    let fallbackMessage = 'An unexpected error occurred. Please try again.';
    if (status === 401) {
      fallbackMessage = 'Authentication required or session expired. Please sign in.';
    } else if (status === 403) {
      fallbackMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (status === 404) {
      fallbackMessage = 'The requested dining resource was not found.';
    } else if (status === 429) {
      fallbackMessage = 'Too many requests. Please wait a moment before trying again.';
    } else if (status >= 500) {
      fallbackMessage = 'Internal server error. Our dining team has been notified.';
    }

    const customError = new Error(serverMessage || fallbackMessage);
    customError.code = code;
    customError.status = status;
    customError.details = errorData?.details || null;

    return Promise.reject(customError);
  }
);

export default api;
