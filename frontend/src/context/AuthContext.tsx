/**
 * AI Interview Assistant - Supabase Auth Context
 * Provides authentication state management using Supabase Auth
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../supabaseClient";
import type { User, Session } from "@supabase/supabase-js";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

// ===========================================
// Types
// ===========================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// ===========================================
// Context
// ===========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================================
// Provider Component
// ===========================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    setIsLoading(false);
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isLoggedIn: !!user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===========================================
// Hook
// ===========================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ===========================================
// Protected Route Component
// ===========================================

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4 text-primary-500" />
          <p className="text-stone-500 dark:text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
