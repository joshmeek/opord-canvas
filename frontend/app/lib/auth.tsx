import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { authApi } from "./api";

// Safe localStorage helper functions
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value);
  }
};

const removeLocalStorageItem = (key: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(key);
  }
};

interface User {
  id: string;
  email: string;
}

// Add JWT token type
interface JWTToken {
  sub: string;
  email: string;
  exp: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  
  // Check for stored token on mount and token changes
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getLocalStorageItem('token');
      if (token) {
        try {
          const decoded = jwtDecode<JWTToken>(token);
          // Verify token hasn't expired
          const currentTime = Date.now() / 1000;
          if (decoded.exp > currentTime) {
            setUser({
              id: decoded.sub,
              email: decoded.email
            });
          } else {
            // Token expired, remove it
            removeLocalStorageItem('token');
            setUser(null);
          }
        } catch (error) {
          // Invalid token
          console.error('Token validation error:', error);
          removeLocalStorageItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);
  
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await authApi.login(email, password);
      const { access_token } = data;
      
      setLocalStorageItem('token', access_token);
      
      try {
        const decoded = jwtDecode<JWTToken>(access_token);
        setUser({
          id: decoded.sub,
          email: decoded.email
        });
      } catch (e) {
        console.error('Token decode error:', e);
        setError('Invalid authentication token received');
        removeLocalStorageItem('token');
        throw new Error('Authentication failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const register = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Register the user
      await authApi.register(email, password);
      
      // After successful registration, log them in
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = () => {
    removeLocalStorageItem('token');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      login,
      register,
      logout, 
      isAuthenticated: !!user,
      error,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 