import axios from "axios";

/*
  ✅ JWT Authentication System
  React (5173) → Spring Boot (8080) → FastAPI (8000)
*/
const api = axios.create({
  baseURL: "http://localhost:8080/api/products",
  timeout: 90000,
});

/* Attach JWT token automatically to all requests */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("omni_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Global error handler for auth errors */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("omni_token");
      localStorage.removeItem("omni_user");
      window.location.href = "/login";
    }
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout: backend took too long");
    }
    console.error("API ERROR:", error);
    return Promise.reject(error);
  }
);

export default api;

/* -------------------------------------------------------
   🔐 AUTH APIs (Real Backend - Spring Boot)
------------------------------------------------------- */
const authAxios = axios.create({
  baseURL: "http://localhost:8080/api/auth",
  timeout: 10000,
});

export const authApi = {
  login: async (email, password) => {
    const response = await authAxios.post("/login", { email, password });
    
    if (response.data?.token) {
      localStorage.setItem("omni_token", response.data.token);
      setTimeout(() => savedApi.sync(), 500); 
    }
    
    return response.data;
  },

  register: async (username, email, password, fullName) => {
    const response = await authAxios.post("/register", { username, email, password, fullName });
    if (response.data?.token) {
      localStorage.setItem("omni_token", response.data.token);
      setTimeout(() => savedApi.sync(), 500);
    }
    return response.data;
  },

  validateToken: async (token) => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await authAxios.get("/validate", config);
    return response.data;
  },
};

/* -------------------------------------------------------
   🔍 SEARCH API
------------------------------------------------------- */
export const searchApi = {
  search: (query) =>
    api.get("/search", { params: { product: query } }).then((r) => r.data),
};

/* -------------------------------------------------------
   🤖 PREDICTION API
------------------------------------------------------- */
export const predictApi = {
  predict: (query) =>
    api.get("/predict", { params: { product: query } }).then((r) => r.data),
};

/* -------------------------------------------------------
   📊 PRICE HISTORY API
------------------------------------------------------- */
export const historyApi = {
  getHistory: (query) =>
    api.get("/price-history", { params: { product: query } }).then((r) => r.data),
};

/* -------------------------------------------------------
   💾 SAVED PRODUCTS (MongoDB + Optimistic Local Cache)
------------------------------------------------------- */

const getCacheKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("omni_user"));
    if (user && user.email) return `omni_saved_cache_${user.email}`;
  } catch (e) {}
  return "omni_saved_cache_guest";
};

export const savedApi = {
  getAll: () => {
    try {
      return JSON.parse(localStorage.getItem(getCacheKey())) || [];
    } catch {
      return [];
    }
  },

  sync: async () => {
    try {
      const response = await api.get("http://localhost:8080/api/saved");
      localStorage.setItem(getCacheKey(), JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error("Failed to sync with MongoDB", error);
      return savedApi.getAll();
    }
  },

  save: async (product) => {
    const all = savedApi.getAll();
    const platform = (product.platform || "unknown").toLowerCase().trim();
    const name = (product.productName || "unknown").toLowerCase().trim();
    const uniqueKey = `${platform}::${name}`; 

    const exists = all.find((p) => {
      const pPlat = (p.platform || "unknown").toLowerCase().trim();
      const pName = (p.productName || "unknown").toLowerCase().trim();
      return `${pPlat}::${pName}` === uniqueKey;
    });

    if (!exists) {
      all.unshift({ ...product, savedAt: new Date().toISOString() });
      localStorage.setItem(getCacheKey(), JSON.stringify(all));

      try {
        await api.post("http://localhost:8080/api/saved", product);
      } catch (error) {
        console.error("MongoDB Save Failed", error);
      }
    }
  },

  remove: async (productKey, platform, uniqueKey) => {
    const all = savedApi.getAll();
    
    // 🔥 THE FIX: Find the EXACT original item before we filter it out to get the correct Capitalization!
    const itemToDelete = all.find((p) => {
      const pPlat = (p.platform || "unknown").toLowerCase().trim();
      const pName = (p.productName || "unknown").toLowerCase().trim();
      const pUnique = `${pPlat}::${pName}`;
      if (uniqueKey) return pUnique === uniqueKey;
      return p.productKey === productKey && p.platform === platform;
    });

    // 1. Instantly update user's private local cache
    const filtered = all.filter((p) => {
      const pPlat = (p.platform || "unknown").toLowerCase().trim();
      const pName = (p.productName || "unknown").toLowerCase().trim();
      const pUnique = `${pPlat}::${pName}`;

      if (uniqueKey) return pUnique !== uniqueKey;
      return !(p.productKey === productKey && p.platform === platform);
    });
    localStorage.setItem(getCacheKey(), JSON.stringify(filtered));

    // 2. Delete from Spring Boot MongoDB using the EXACT ORIGINAL casing
    try {
      if (itemToDelete) {
        await api.delete("http://localhost:8080/api/saved/remove", {
          params: { 
            productName: itemToDelete.productName, // e.g., "Apple iPhone 17e" instead of "apple iphone 17e"
            platform: itemToDelete.platform 
          }
        });
      }
    } catch (error) {
      console.error("MongoDB Delete Failed", error);
    }
  },

  clear: async () => {
    localStorage.setItem(getCacheKey(), "[]");
    try {
      await api.delete("http://localhost:8080/api/saved/clear");
    } catch (error) {
      console.error("MongoDB Clear Failed", error);
    }
  },
};

/* -------------------------------------------------------
   🔔 NOTIFICATIONS (localStorage)
------------------------------------------------------- */
export const notificationApi = {
  getAll: () =>
    JSON.parse(localStorage.getItem("omni_notifications") || "[]"),

  push: (notif) => {
    const all = notificationApi.getAll();
    all.unshift({
      ...notif,
      id: Date.now(),
      read: false,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("omni_notifications", JSON.stringify(all.slice(0, 50)));
  },

  markAllRead: () => {
    const all = notificationApi.getAll().map((n) => ({ ...n, read: true }));
    localStorage.setItem("omni_notifications", JSON.stringify(all));
  },

  clear: () => localStorage.removeItem("omni_notifications"),
};