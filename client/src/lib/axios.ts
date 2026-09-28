import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // send HttpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Global response interceptor — redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on an auth page
      const publicPaths = ['/login', '/forgot-password', '/reset-password', '/setup'];
      const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isPublic) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
