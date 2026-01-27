import { createContext } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface AuthContextType {
    user: SupabaseUser | null;
    session: Session | null;
    loading: boolean;
    setSession: (session: Session | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    setSession: () => { },
});
