import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Base API URL - adjust based on your backend URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";


// Socket.io base URL - extract from API_BASE_URL by removing /api/v1
// Socket connections need the base server URL without the API path
export const getSocketBaseURL = (): string => {
  // Use VITE_API_URL or VITE_API_BASE_URL
  const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "/api/v1";

  // Remove /api/v1 or /api and any trailing slash from the end
  const socketUrl = apiBaseUrl.replace(/\/api\/v\d+\/?$|\/api\/?$|\/$/, '');

  return socketUrl || window.location.origin;
};

// Log the API base URL for debugging (only in development or if there's an issue)
if (import.meta.env.DEV || !import.meta.env.VITE_API_BASE_URL) {
  console.log('[API Config] Base URL:', API_BASE_URL);
  console.log('[API Config] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('[API Config] Socket Base URL:', getSocketBaseURL());
  console.log('[API Config] Secure Context:', window.isSecureContext ? '✅ Yes' : '❌ No (FCM will fail on mobile)');
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("authToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: any) => {
    const isUnauthorized = error.response?.status === 401;
    const isWrongUserType = error.response?.status === 403 && error.response?.data?.message?.includes('Required user type');

    if (isUnauthorized || isWrongUserType) {
      const isAuthEndpoint = error.config?.url?.includes("/auth/");
      const hadToken = error.config?.headers?.Authorization;

      if (!isAuthEndpoint && hadToken) {
        const currentPath = window.location.pathname;

        if (currentPath.includes("/login") || currentPath.includes("/signup")) {
          return Promise.reject(error);
        }

        const apiUrl = error.config?.url || "";
        let redirectPath = "/login";

        if (currentPath.includes("/admin/") || apiUrl.includes("/admin/")) {
          redirectPath = "/admin/login";
        } else if (
          currentPath.includes("/seller/") ||
          apiUrl.includes("/seller/") ||
          apiUrl.includes("/sellers")
        ) {
          redirectPath = "/seller/login";
        } else if (
          currentPath.includes("/delivery/") ||
          apiUrl.includes("/delivery/")
        ) {
          redirectPath = "/delivery/login";
        }

        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        
        // Use a short timeout to let pending operations finish before redirecting
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

// Token management helpers
export const setAuthToken = (token: string) => {
  localStorage.setItem("authToken", token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("fcm_token_web"); // Clear FCM registration cache on logout
};

export default api;
