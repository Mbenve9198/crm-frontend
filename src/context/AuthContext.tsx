"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/contact';
import { apiClient } from '@/lib/api';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Verifica l'autenticazione al caricamento
  const checkAuth = async () => {
    try {
      console.log('=== Auth Check Debug ===');
      
      // Leggi il token dal localStorage direttamente
      const tokenFromStorage = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') 
        : null;
      
      const tokenFromClient = apiClient.getToken();
      
      console.log('Token da localStorage:', tokenFromStorage ? tokenFromStorage.substring(0, 20) + '...' : 'NESSUNO');
      console.log('Token da apiClient:', tokenFromClient ? tokenFromClient.substring(0, 20) + '...' : 'NESSUNO');
      
      // Se c'è un token nel localStorage ma non nell'apiClient, sincronizza
      if (tokenFromStorage && !tokenFromClient) {
        console.log('🔧 Sincronizzando token da localStorage ad apiClient');
        apiClient.setToken(tokenFromStorage);
      }
      
      const finalToken = apiClient.getToken();
      console.log('Token finale apiClient:', finalToken ? finalToken.substring(0, 20) + '...' : 'NESSUNO');
      
      if (!finalToken) {
        console.log('❌ Nessun token disponibile');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      console.log('✅ Verificando autenticazione con token...');
      const response = await apiClient.getMe();
      
      if (response.success && response.data) {
        console.log('✅ Autenticazione valida:', response.data.user.firstName, response.data.user.lastName);
        setState({
          user: response.data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        console.log('❌ Token non valido, rimuovo');
        // Token non valido
        apiClient.setToken(null);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('❌ Errore durante check auth:', error);
      apiClient.setToken(null);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      console.log('=== Login Debug ===');
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        console.log('✅ Login riuscito, token salvato');
        console.log('Token salvato:', response.data.token.substring(0, 20) + '...');
        
        // Verifica che il token sia stato salvato correttamente
        const savedToken = apiClient.getToken();
        console.log('Token verificato in apiClient:', savedToken ? savedToken.substring(0, 20) + '...' : 'ERRORE: NESSUNO');
        
        setState({
          user: response.data.user,
          isLoading: false,
          isAuthenticated: true,
        });
        return { success: true };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: response.message || 'Errore durante il login' 
        };
      }
    } catch (error: unknown) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore di connessione' 
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 