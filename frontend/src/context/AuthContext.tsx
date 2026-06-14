import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, AuthResponse } from "../types";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("preproute_token"));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("preproute_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const queryClient = useQueryClient();

  const login = (auth: AuthResponse) => {
    localStorage.setItem("preproute_token", auth.token);
    localStorage.setItem("preproute_user", JSON.stringify(auth.user));
    setToken(auth.token);
    setUser(auth.user);
  };

  const logout = () => {
    localStorage.removeItem("preproute_token");
    localStorage.removeItem("preproute_user");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
