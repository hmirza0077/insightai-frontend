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
      // Profile endpoint returns user data directly
      setUser(response.data);
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
      // Handle different auth result formats
      // New format: { success: true, token: '...' }
      // Old format: { tokens: { access: '...', refresh: '...' }, user: {...} }
      
      if (authResult.token) {
        // New single token format (already stored in api.js)
        // Token is already set by the API function
      } else if (authResult.tokens) {
        // Old format with separate access/refresh tokens
        localStorage.setItem('accessToken', authResult.tokens.access);
        if (authResult.tokens.refresh) {
          localStorage.setItem('refreshToken', authResult.tokens.refresh);
        }
      }
      
      // Set user if provided, otherwise fetch from API
      if (authResult.user) {
        setUser(authResult.user);
      } else {
        // Fetch user profile - don't fail the whole login if this fails
        try {
          const response = await authAPI.getCurrentUser();
          setUser(response.data);
        } catch (profileError) {
          console.error('Failed to fetch user profile:', profileError);
          // Set a minimal user object so the app can continue
          setUser({ id: 'unknown', email: '', username: '' });
        }
      }
      
      return authResult;
    } catch (error) {
      console.error('Login error:', error);
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
      setUser(response.data);
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
