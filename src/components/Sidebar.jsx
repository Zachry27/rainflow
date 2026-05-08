import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Sidebar({
    activeStep,
    onStepChange,
    completedSteps,
    imageCount,
    driveStatus,      // { connected: bool, name: string, email: string }
    isOpen,
    isCollapsed,
    onToggleCollapse,
    onOpenSettings,
    onOpenStorage,
}) {
    const navigate = useNavigate()

    return (
        <aside
            className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isOpen ? 'sidebar--open' : ''}`}
            id="sidebar"
        >
            {/* Logo */}
            <div className="sidebar__logo">
                <span className="sidebar__logo-icon">🌊</span>
                {!isCollapsed && (
                    <div className="sidebar__logo-text-wrap">
                        <span className="sidebar__logo-name">RainFlow</span>
                        <span className="sidebar__logo-version">v2.0</span>
                    </div>
                )}
                <button
                    className="sidebar__collapse-btn"
                    onClick={onToggleCollapse}
                    id="sidebar-collapse-btn"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? '›' : '‹'}
                </button>
            </div>

            {/* Main Menu section */}
            <div className="sidebar__section">
                {!isCollapsed && (
                    <span className="sidebar__section-label">Menu Utama</span>
                )}
                <nav className="sidebar__nav" id="sidebar-nav">
                    <button
                        className={`sidebar__nav-item sidebar__nav-item--active`}
                        onClick={() => onStepChange('upload')}
                        title={isCollapsed ? 'Beranda' : ''}
                    >
                        <span className="sidebar__nav-icon">🏠</span>
                        {!isCollapsed && <span className="sidebar__nav-label">Beranda</span>}
                        <span className="sidebar__nav-indicator" />
                    </button>
                    <button
                        className="sidebar__nav-item"
                        onClick={onOpenStorage}
                        title={isCollapsed ? 'Storage & History' : ''}
                    >
                        <span className="sidebar__nav-icon">🗄️</span>
                        {!isCollapsed && <span className="sidebar__nav-label">Storage & History</span>}
                    </button>
                    <button
                        className="sidebar__nav-item"
                        onClick={onOpenSettings}
                        title={isCollapsed ? 'Pengaturan' : ''}
                    >
                        <span className="sidebar__nav-icon">⚙️</span>
                        {!isCollapsed && <span className="sidebar__nav-label">Pengaturan</span>}
                    </button>
                </nav>
            </div>

            {/* Divider */}
            <div className="sidebar__divider" />

            {/* Utility section */}
            <div className="sidebar__section">
                {!isCollapsed && (
                    <span className="sidebar__section-label">More</span>
                )}
                <nav className="sidebar__nav">
                    <button
                        className="sidebar__nav-item"
                        onClick={() => navigate('/admin')}
                        id="sidebar-admin-btn"
                        title={isCollapsed ? 'Admin Dashboard' : ''}
                    >
                        <span className="sidebar__nav-icon">📊</span>
                        {!isCollapsed && <span className="sidebar__nav-label">Admin</span>}
                    </button>
                </nav>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Drive Status */}
            <div className={`sidebar__drive ${driveStatus?.connected ? 'sidebar__drive--connected' : ''}`} id="sidebar-drive-status">
                <span className={`sidebar__drive-dot ${driveStatus?.connected ? 'sidebar__drive-dot--on' : 'sidebar__drive-dot--off'}`} />
                {!isCollapsed && (
                    <div className="sidebar__drive-info">
                        <span className="sidebar__drive-label">
                            {driveStatus?.connected ? 'Drive Connected' : 'Drive Disconnected'}
                        </span>
                        {driveStatus?.connected && driveStatus?.name && (
                            <span className="sidebar__drive-name">{driveStatus.name}</span>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}
