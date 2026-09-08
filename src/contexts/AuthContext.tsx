import { createContext } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface AuthContextType {
    user: SupabaseUser | null;
    session: Session | null;
    loading: boolean;
    setSession: (session: Session | null) => void;
    impersonatedUser: SupabaseUser | null;
    startImpersonation: (user: SupabaseUser) => void;
    stopImpersonation: () => void;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    setSession: () => { },
    impersonatedUser: null,
    startImpersonation: () => { },
    stopImpersonation: () => { }
});
