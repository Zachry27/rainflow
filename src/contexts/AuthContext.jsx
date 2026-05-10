import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const clearAuth = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
    };

    const fetchCurrentUser = async (authToken) => {
        const res = await fetch('/v1/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!res.ok) throw new Error('Session invalid');
        return res.json();
    };

    const checkAuth = async (authToken = token) => {
        if (!authToken) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await fetchCurrentUser(authToken);
            setUser(data);
        } catch (err) {
            console.error(err);
            clearAuth();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, [token]);

    const getAuthError = async (res, fallback) => {
        try {
            const data = await res.json();
            return data.detail || fallback;
        } catch (err) {
            return fallback;
        }
    };

    const login = async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const res = await fetch('/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                const nextToken = data.access_token;
                const currentUser = await fetchCurrentUser(nextToken);

                localStorage.setItem('token', nextToken);
                setToken(nextToken);
                setUser(currentUser);
                setLoading(false);
                return { success: true };
            }

            return {
                success: false,
                error: await getAuthError(res, 'Login gagal. Username atau password salah.'),
            };
        } catch (err) {
            return {
                success: false,
                error: 'Server login belum menyala. Pastikan backend Python port 9564 aktif.',
            };
        }
    };
    
    const register = async (username, password) => {
        try {
            const res = await fetch('/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                return await login(username, password);
            }

            const error = await getAuthError(res, 'Registrasi gagal.');
            return {
                success: false,
                error: error === 'Username already registered'
                    ? 'Username sudah terdaftar. Klik Login lalu masuk dengan password lama.'
                    : error,
            };
        } catch (err) {
            return {
                success: false,
                error: 'Server login belum menyala. Pastikan backend Python port 9564 aktif.',
            };
        }
    };

    const logout = clearAuth;

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
