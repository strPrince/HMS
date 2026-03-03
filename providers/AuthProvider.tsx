import React, { createContext, useContext, useMemo, useState } from 'react';
import type { StaffProfile } from '../types/staff';

type AuthContextValue = {
  user: StaffProfile | null;
  selectedProfile: StaffProfile | null;
  selectProfile: (profile: StaffProfile) => void;
  clearProfile: () => void;
  signInWithPin: (pin: string) => boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<StaffProfile | null>(null);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      selectedProfile,
      selectProfile: (profile: StaffProfile) => setSelectedProfile(profile),
      clearProfile: () => setSelectedProfile(null),
      signInWithPin: (pin: string) => {
        if (!selectedProfile) return false;
        if (selectedProfile.pin !== pin) return false;
        setUser(selectedProfile);
        return true;
      },
      signOut: () => {
        setUser(null);
        setSelectedProfile(null);
      }
    };
  }, [selectedProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
