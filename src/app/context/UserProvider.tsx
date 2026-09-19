// src/providers/UserProvider.tsx
'use client';

import { createContext, useContext } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

const UserContext = createContext<User | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}