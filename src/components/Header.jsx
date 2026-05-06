import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    return (
        <header className="header" style={{ position: 'relative' }}>
            <div style={{ textAlign: 'center' }}>
                <span className="header__icon">🌊</span>
                <h1 className="header__title">RainFlow</h1>
                <p className="header__subtitle">
                    YouTube Content Creator Pipeline — Dari Gambar ke Video Siap Upload
                </p>
                <span className="header__badge">
                    ⚡ AI-Powered • FFmpeg • Auto-naming
                </span>
            </div>
            
            {user && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Hi, {user.username}</span>
                    {user.role === 'admin' && (
                        <button 
                            onClick={() => navigate('/admin')}
                            style={{ padding: '4px 8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            Admin
                        </button>
                    )}
                    <button 
                        onClick={logout}
                        style={{ padding: '4px 8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </header>
    )
}
