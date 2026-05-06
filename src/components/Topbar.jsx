import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ onMenuToggle, activeStep, isSidebarOpen }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [userMenuOpen, setUserMenuOpen] = useState(false)

    const STEP_LABELS = {
        upload: '📁 Import Gambar',
        generate: '🤖 Generate Video',
        process: '🔁 FFmpeg Process',
        export: '📦 Export & Upload',
    }

    return (
        <header className="topbar" id="topbar">
            {/* Left: Hamburger (mobile) + Logo */}
            <div className="topbar__left">
                <button
                    className="topbar__menu-btn"
                    onClick={onMenuToggle}
                    id="topbar-menu-btn"
                    aria-label="Toggle sidebar"
                >
                    <span className={`topbar__hamburger ${isSidebarOpen ? 'topbar__hamburger--open' : ''}`}>
                        <span /><span /><span />
                    </span>
                </button>
                <div className="topbar__logo">
                    <span className="topbar__logo-icon">🌊</span>
                    <span className="topbar__logo-text">RainFlow</span>
                    <span className="topbar__logo-badge">v2</span>
                </div>
            </div>

            {/* Center: Breadcrumb */}
            <div className="topbar__center">
                <span className="topbar__breadcrumb">
                    Pipeline
                    <span className="topbar__breadcrumb-sep">›</span>
                    <span className="topbar__breadcrumb-active">{STEP_LABELS[activeStep] || 'Dashboard'}</span>
                </span>
            </div>

            {/* Right: User menu */}
            <div className="topbar__right">
                {user && (
                    <div className="topbar__user" style={{ position: 'relative' }}>
                        <button
                            className="topbar__user-btn"
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            id="topbar-user-btn"
                        >
                            <div className="topbar__avatar">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="topbar__username">{user.username}</span>
                            <span className="topbar__chevron">{userMenuOpen ? '▲' : '▼'}</span>
                        </button>

                        {userMenuOpen && (
                            <div className="topbar__dropdown" id="topbar-dropdown">
                                <div className="topbar__dropdown-header">
                                    <div className="topbar__dropdown-name">{user.username}</div>
                                    {user.role === 'admin' && (
                                        <span className="topbar__role-badge">Admin</span>
                                    )}
                                </div>
                                <div className="topbar__dropdown-divider" />
                                {user.role === 'admin' && (
                                    <button
                                        className="topbar__dropdown-item"
                                        onClick={() => { navigate('/admin'); setUserMenuOpen(false) }}
                                        id="topbar-admin-btn"
                                    >
                                        📊 Dashboard Admin
                                    </button>
                                )}
                                <button
                                    className="topbar__dropdown-item topbar__dropdown-item--danger"
                                    onClick={() => { logout(); setUserMenuOpen(false) }}
                                    id="topbar-logout-btn"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    )
}
