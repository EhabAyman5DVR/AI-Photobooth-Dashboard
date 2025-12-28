
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types';
import { initializeStore } from '@/store';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [auth, setAuth] = useState<AuthState>({
        user: null,
        isAuthenticated: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeStore();
        const storedAuth = localStorage.getItem('pb_auth');
        if (storedAuth) {
            setAuth({
                user: JSON.parse(storedAuth),
                isAuthenticated: true
            });
        }
        setLoading(false);
    }, []);

    const login = (user: User) => {
        localStorage.setItem('pb_auth', JSON.stringify(user));
        setAuth({ user, isAuthenticated: true });
    };

    const logout = () => {
        localStorage.removeItem('pb_auth');
        setAuth({ user: null, isAuthenticated: false });
    };

    return (
        <AuthContext.Provider value={{ ...auth, login, logout, loading }}>
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
