
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, UserRole } from '@/types';
import { supabase } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchUserProfile(session);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                await fetchUserProfile(session);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (session: Session, retryCount = 0) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (data) {
                setUser({
                    id: data.id,
                    name: data.full_name || 'Admin User',
                    email: data.email,
                    role: (data.role as UserRole) || UserRole.REGULAR,
                    assignedProjectIds: []
                });
                setLoading(false);
            } else if (retryCount < 3) {
                // If profile not found, wait 1 second and retry (gives trigger time to finish)
                console.log(`Profile not found, retrying... (${retryCount + 1})`);
                setTimeout(() => fetchUserProfile(session, retryCount + 1), 1000);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            if (retryCount < 3) {
                setTimeout(() => fetchUserProfile(session, retryCount + 1), 1000);
            } else {
                setLoading(false);
            }
        }
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) console.error('Error logging in:', error);
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            // Force a hard reload to the login page to clear all local states
            window.location.href = '/login';
        } catch (error) {
            console.error('Error during logout:', error);
            // Fallback redirect even on error
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!session,
            loginWithGoogle,
            logout,
            loading,
            session
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
