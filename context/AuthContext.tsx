"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Parse, { initParse } from "@/lib/parse";
import { signOut as parseSignOut } from "@/lib/auth";

interface AuthValue {
  user: Parse.User | null;
  loading: boolean;
  refreshUser: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null, loading: true, refreshUser: () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Parse.User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () => {
    initParse();
    setUser(Parse.User.current() ?? null);
  };

  useEffect(() => {
    refreshUser();
    setLoading(false);
  }, []);

  async function signOut() {
    await parseSignOut().catch(() => {});
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
