import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainApp from './MainApp';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header'; // Maybe not needed if MainApp has it

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>Loading...</div>;
    if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
    return children;
};

import PWAPrompt from './components/PWAPrompt';

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <PWAPrompt />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route 
                        path="/admin" 
                        element={
                            <AdminRoute>
                                <AdminDashboard />
                            </AdminRoute>
                        } 
                    />
                    <Route 
                        path="/*" 
                        element={
                            <ProtectedRoute>
                                <MainApp />
                            </ProtectedRoute>
                        } 
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}
