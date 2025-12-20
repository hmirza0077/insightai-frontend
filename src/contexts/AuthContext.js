import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!authAPI.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
    } catch (error) {
      // Token might be expired, try to refresh is handled by interceptor
      // If still fails, clear user
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (authResult) => {
    try {
      // authResult should contain user, tokens, wallet
      if (authResult.tokens) {
        localStorage.setItem('accessToken', authResult.tokens.access);
        localStorage.setItem('refreshToken', authResult.tokens.refresh);
      }
      
      if (authResult.user) {
        setUser(authResult.user);
      } else {
        // Fetch user if not in result
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
      }
      
      return authResult;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // Ignore errors
    }
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, checkAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
