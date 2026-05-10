import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login, register, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/', { replace: true });
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        setError('');
        setSubmitting(true);
        
        const result = isLogin
            ? await login(username, password)
            : await register(username, password);
            
        if (result.success) {
            navigate('/', { replace: true });
        } else {
            setError(result.error || (isLogin ? 'Login gagal.' : 'Registrasi gagal.'));
        }

        setSubmitting(false);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '0' }}>
                <h2 className="card__title" style={{ justifyContent: 'center', fontSize: '24px', marginBottom: '30px' }}>
                    <span className="card__title-icon">🌊</span>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                
                {error && <div style={{ color: 'var(--error)', backgroundColor: 'var(--error-bg)', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '13px' }}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="settings-field">
                        <label className="settings-field__label">Username</label>
                        <input 
                            className="settings-field__input"
                            type="text" 
                            placeholder="Enter username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="settings-field">
                        <label className="settings-field__label">Password</label>
                        <input 
                            className="settings-field__input"
                            type="password" 
                            placeholder="Enter password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn--primary btn--full"
                        disabled={submitting}
                        style={{ marginTop: '10px' }}
                    >
                        {submitting ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>
                
                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span 
                        onClick={() => setIsLogin(!isLogin)} 
                        style={{ color: 'var(--primary-light)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </span>
                </p>
            </div>
        </div>
    );
}
