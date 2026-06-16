import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios instance
export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('mediscan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mediscan_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(
    localStorage.getItem('mediscan_token')
  );

  // Load user
  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await API.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('mediscan_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const _setToken = (t) => {
    localStorage.setItem('mediscan_token', t);
    setToken(t);
  };

  // 🔐 Normal login
  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    _setToken(data.token);
    setUser(data.user);
    return data;
  };

  // 📝 Register
  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    _setToken(data.token);
    setUser(data.user);
    return data;
  };

  // 🔥 OAuth login FIXED
  const loginWithOAuth = async (t) => {
    try {
      // Save token
      localStorage.setItem('mediscan_token', t);
      setToken(t);

      // Fetch user directly (no interceptor issue)
      const { data } = await axios.get(
        `${API_BASE_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${t}`,
          },
        }
      );

      setUser(data.user);
    } catch (err) {
      console.error('OAuth failed:', err);
      logout();
      throw err;
    }
  };

  // 🚪 Logout
  const logout = () => {
    localStorage.removeItem('mediscan_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await API.get('/auth/me');
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        register,
        logout,
        loginWithOAuth,
        refreshUser,
        API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};