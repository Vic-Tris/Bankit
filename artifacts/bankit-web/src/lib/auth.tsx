import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLogin, useLogout, useRefreshToken, setAuthTokenGetter } from "@workspace/api-client-react";
import type { User, LoginInput } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

let _accessToken: string | null = null;

setAuthTokenGetter(() => _accessToken);

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const initialized = useRef(false);

  const refreshMutation = useRefreshToken();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      const rt = localStorage.getItem("refreshToken");
      if (!rt) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await refreshMutation.mutateAsync({ data: { refreshToken: rt } });
        _accessToken = res.accessToken;
        localStorage.setItem("refreshToken", res.refreshToken);
        setUser(res.user);
      } catch {
        localStorage.removeItem("refreshToken");
        _accessToken = null;
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginInput) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      _accessToken = res.accessToken;
      localStorage.setItem("refreshToken", res.refreshToken);
      setUser(res.user);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
    } finally {
      _accessToken = null;
      localStorage.removeItem("refreshToken");
      setUser(null);
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
