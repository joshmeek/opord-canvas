import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { authApi } from "./api";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check for stored token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<{sub: string; email: string}>(token);
        setUser({
          id: decoded.sub,
          email: decoded.email
        });
      } catch (error) {
        // Invalid token
        localStorage.removeItem("token");
      }
    }
  }, []);
  
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await authApi.login(email, password);
      const { access_token } = data;
      
      localStorage.setItem('token', access_token);
      
      // For JWT format like xxx.yyy.zzz
      try {
        const decoded = jwtDecode<{sub: string; email: string}>(access_token);
        setUser({
          id: decoded.sub,
          email: decoded.email
        });
      } catch (e) {
        console.error('Token decode error:', e);
        // Even if decoding fails, we may still be authenticated
        // Let's still consider user logged in but with limited info
        setUser({ id: 'unknown', email });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
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