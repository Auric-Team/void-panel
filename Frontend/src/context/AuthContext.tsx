import React, { createContext, useContext, useState, useEffect } from "react";
import { api, UserPublicProfile, UserRole } from "../lib/api";

interface AuthContextType {
  user: UserPublicProfile | null;
  role: UserRole;
  credits: number;
  isAuthenticated: boolean;
  loading: boolean;
  login: (u: string, p: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "reseller",
  credits: 0,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = api.getAuthToken();
      if (token) {
        await refreshProfile();
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (u: string, p: string) => {
    const res = await api.login(u, p);
    if (res && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const role: UserRole = user?.role || "reseller";
  const credits: number = user?.credits || 0;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        credits,
        isAuthenticated,
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
