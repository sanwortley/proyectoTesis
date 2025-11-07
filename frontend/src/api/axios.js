// src/api/axios.js
import axios from "axios";

// ✅ crea una instancia con baseURL y timeout
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
  timeout: 10000,
});

// ✅ Interceptor para agregar el token si el usuario está logueado
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      const token = JSON.parse(user).token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Interceptor opcional para logs de errores o expiraciones
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Sesión expirada o no autorizada");
    }
    return Promise.reject(error);
  }
);

export default api;
