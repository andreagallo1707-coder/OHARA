import React, { createContext, useContext, useState, useEffect } from 'react';

interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'ohara_mock_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      // Auto-login as guest for convenience if no user is saved
      const guestUser = { uid: 'guest', email: 'guest@ohara.edu', displayName: 'Ricercatore Ospite' };
      setUser(guestUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guestUser));
    }
    setLoading(false);
  }, []);

  const loginWithGoogle = async () => {
    const mockUser = { uid: 'google-123', email: 'user@gmail.com', displayName: 'Google User' };
    setUser(mockUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
  };

  const loginWithEmail = async (email: string, _pass: string) => {
    const mockUser = { uid: 'email-123', email, displayName: email.split('@')[0] };
    setUser(mockUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
  };

  const registerWithEmail = async (email: string, _pass: string, name: string) => {
    const mockUser = { uid: 'reg-123', email, displayName: name };
    setUser(mockUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      logout,
      isConfigured: true // Always "configured" in mock mode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
