import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '../utils/apiClient';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const setTokens = (tokens: AuthTokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    apiClient.setAuthToken(tokens.accessToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    apiClient.clearAuthToken();
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/login', {
        email,
        password,
      });

      setUser(response.user);
      setTokens(response.tokens);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ログインに失敗しました');
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      const response = await apiClient.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/register', {
        email,
        password,
        displayName,
      });

      setUser(response.user);
      setTokens(response.tokens);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '登録に失敗しました');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearTokens();
    }
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken,
      });

      localStorage.setItem('accessToken', response.accessToken);
      apiClient.setAuthToken(response.accessToken);

      const userResponse = await apiClient.get<User>('/auth/me');
      setUser(userResponse);
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      
      if (accessToken) {
        apiClient.setAuthToken(accessToken);
        
        try {
          const userResponse = await apiClient.get<User>('/auth/me');
          setUser(userResponse);
        } catch (error) {
          console.error('Auth verification failed:', error);
          await refreshAuth();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};