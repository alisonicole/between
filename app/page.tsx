"use client";

import { useAuth } from "@/context/AuthContext";
import { SignIn } from "@/components/SignIn";
import { BetweenApp } from "@/components/BetweenApp";

export default function Home() {
  const { user, loading, refreshUser, signOut } = useAuth();
  if (loading) return null;
  if (!user) return <SignIn onSignedIn={refreshUser} />;
  return <BetweenApp key={user.id} onSignOut={signOut} />;
}
