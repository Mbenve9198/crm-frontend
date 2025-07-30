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
      
      // Aspetta un momento per localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Leggi il token dal localStorage direttamente
      const tokenFromStorage = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') 
        : null;
      
      const tokenFromClient = apiClient.getToken();
      
      console.log('Token da localStorage:', tokenFromStorage ? `${tokenFromStorage.substring(0, 20)}...` : 'NESSUNO');
      console.log('Token da apiClient:', tokenFromClient ? `${tokenFromClient.substring(0, 20)}...` : 'NESSUNO');
      
      // Se c'è un token nel localStorage ma non nell'apiClient, sincronizza
      if (tokenFromStorage && !tokenFromClient) {
        console.log('🔧 Sincronizzando token da localStorage ad apiClient');
        apiClient.setToken(tokenFromStorage);
      }
      
      const finalToken = apiClient.getToken();
      console.log('Token finale apiClient:', finalToken ? `${finalToken.substring(0, 20)}...` : 'NESSUNO');
      
      if (!finalToken) {
        console.log('❌ Nessun token disponibile - utente non autenticato');
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
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
      // Solo rimuovi il token se è veramente un errore di auth
      if (error instanceof Error && error.message.includes('401')) {
        apiClient.setToken(null);
      }
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
      console.log('Avvio login per:', email);
      
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        // CORREZIONE: Il token è in response.token, NON in response.data.token!
        const token = response.token; // Il backend restituisce token al livello principale
        console.log('✅ Login riuscito, token ricevuto');
        
        // Verifica sicura del token
        if (token && typeof token === 'string' && token.length > 0) {
          console.log('Token ricevuto:', token.substring(0, 20) + '...');
          
          // Verifica immediata che il token sia stato salvato
          const savedToken = apiClient.getToken();
          const storageToken = localStorage.getItem('auth_token');
          
          console.log('Token in apiClient dopo login:', savedToken ? savedToken.substring(0, 20) + '...' : 'ERRORE: NESSUNO');
          console.log('Token in localStorage dopo login:', storageToken ? storageToken.substring(0, 20) + '...' : 'ERRORE: NESSUNO');
          
          if (!savedToken || !storageToken) {
            console.error('❌ ERRORE CRITICO: Token non salvato correttamente!');
            throw new Error('Errore nel salvataggio del token');
          }
          
          // Aggiorna lo stato SUBITO senza chiamare checkAuth
          console.log('🎯 Aggiornando stato AuthContext direttamente');
          setState({
            user: response.data.user,
            isLoading: false,
            isAuthenticated: true,
          });
          
          console.log('✅ Login completato, stato aggiornato');
          return { success: true };
        } else {
          console.error('❌ ERRORE: Token non valido dal backend');
          console.error('   - Tipo token:', typeof token);
          console.error('   - Lunghezza token:', token?.length);
          console.error('   - Valore token:', token);
          throw new Error('Token non valido ricevuto dal backend');
        }
        
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: response.message || 'Errore durante il login' 
        };
      }
    } catch (error: unknown) {
      console.error('❌ Errore durante login:', error);
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

  // Chiamiamo checkAuth solo una volta al mount
  useEffect(() => {
    console.log('🚀 AuthProvider: Mounting, chiamando checkAuth...');
    checkAuth();
  }, []); // Array vuoto - solo al mount

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
  };

  console.log('🔍 AuthProvider render - stato attuale:', {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    hasUser: !!state.user,
    userName: state.user ? `${state.user.firstName} ${state.user.lastName}` : 'N/A'
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 