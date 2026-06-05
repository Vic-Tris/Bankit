import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, useRefreshToken, useLogin, useLogout } from "@workspace/api-client-react";
import type { User, LoginInput } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: meData, error: meError } = useGetMe({
    query: {
      retry: false,
      enabled: !user && !!localStorage.getItem("refreshToken"),
    },
  });

  const refreshMutation = useRefreshToken();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  useEffect(() => {
    const initAuth = async () => {
      const rt = localStorage.getItem("refreshToken");
      if (!rt) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await refreshMutation.mutateAsync({ data: { refreshToken: rt } });
        setUser(res.user);
      } catch (err) {
        localStorage.removeItem("refreshToken");
      } finally {
        setIsLoading(false);
      }
    };
    if (!user) {
      initAuth();
    }
  }, []);

  const login = async (data: LoginInput) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
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
    } finally {
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
