import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('omni_token');
      const savedUser = localStorage.getItem('omni_user');
      
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error('Error loading auth state:', err);
      localStorage.removeItem('omni_token');
      localStorage.removeItem('omni_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authApi.login(email, password);
      
      setToken(response.token);
      setUser({
        username: response.username,
        email: response.email,
        fullName: response.fullName,
        avatar: response.avatar,
      });
      
      localStorage.setItem('omni_token', response.token);
      localStorage.setItem('omni_user', JSON.stringify({
        username: response.username,
        email: response.email,
        fullName: response.fullName,
        avatar: response.avatar,
      }));
      
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (username, email, password, fullName) => {
    try {
      setError(null);
      const response = await authApi.register(username, email, password, fullName);
      
      setToken(response.token);
      setUser({
        username: response.username,
        email: response.email,
        fullName: response.fullName,
        avatar: response.avatar,
      });
      
      localStorage.setItem('omni_token', response.token);
      localStorage.setItem('omni_user', JSON.stringify({
        username: response.username,
        email: response.email,
        fullName: response.fullName,
        avatar: response.avatar,
      }));
      
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
  };

  // 🔥 FIX: Added updateUser so the Profile Page can sync with the Header Menu!
  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateUser, // Exposed to the app here
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};