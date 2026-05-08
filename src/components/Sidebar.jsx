import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PIPELINE_STEPS = [
    { id: 'upload',   icon: '📁', label: 'Import Gambar' },
    { id: 'generate', icon: '🤖', label: 'Generate Video' },
    { id: 'process',  icon: '🔁', label: 'Seamless Loop' },
    { id: 'export',   icon: '📦', label: 'Export & Ringkasan' },
]

export default function Sidebar({
    activeStep,
    onStepChange,
    completedSteps,
    imageCount,
    driveStatus,
    isOpen,
    isCollapsed,
    onToggleCollapse,
    onOpenSettings,
    onOpenStorage,
}) {
    const navigate = useNavigate()
    const { user } = useAuth()

    const NavItem = ({ id, icon, label, onClick, isActive, isDone }) => (
        <button
            className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''} ${isDone && !isActive ? 'sidebar__nav-item--done' : ''}`}
            onClick={onClick}
            title={isCollapsed ? label : ''}
            id={`sidebar-nav-${id}`}
        >
            <span className="sidebar__nav-icon">{isDone && !isActive ? '✓' : icon}</span>
            {!isCollapsed && <span className="sidebar__nav-label">{label}</span>}
            {isActive && <span className="sidebar__nav-indicator" />}
        </button>
    )

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
                    title={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                >
                    {isCollapsed ? '›' : '‹'}
                </button>
            </div>

            {/* Navigasi Utama */}
            <div className="sidebar__section">
                {!isCollapsed && (
                    <span className="sidebar__section-label">Navigasi</span>
                )}
                <nav className="sidebar__nav" id="sidebar-nav">
                    <NavItem
                        id="dashboard"
                        icon="🏠"
                        label="Beranda"
                        onClick={() => onStepChange('dashboard')}
                        isActive={activeStep === 'dashboard'}
                    />
                    <NavItem
                        id="storage"
                        icon="🗄️"
                        label="Storage & Riwayat"
                        onClick={onOpenStorage}
                        isActive={false}
                    />
                    <NavItem
                        id="settings"
                        icon="⚙️"
                        label="Pengaturan"
                        onClick={onOpenSettings}
                        isActive={false}
                    />
                </nav>
            </div>

            <div className="sidebar__divider" />

            {/* Pipeline Steps */}
            <div className="sidebar__section">
                {!isCollapsed && (
                    <span className="sidebar__section-label">Pipeline</span>
                )}
                <nav className="sidebar__nav">
                    {PIPELINE_STEPS.map(step => (
                        <NavItem
                            key={step.id}
                            id={step.id}
                            icon={step.icon}
                            label={step.label}
                            onClick={() => onStepChange(step.id)}
                            isActive={activeStep === step.id}
                            isDone={completedSteps?.[step.id]}
                        />
                    ))}
                </nav>
            </div>

            <div className="sidebar__divider" />

            {/* Admin (hanya untuk admin) */}
            {user?.role === 'admin' && (
                <div className="sidebar__section">
                    <nav className="sidebar__nav">
                        <NavItem
                            id="admin"
                            icon="📊"
                            label="Admin Dashboard"
                            onClick={() => navigate('/admin')}
                            isActive={false}
                        />
                    </nav>
                </div>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Drive Status */}
            <div
                className={`sidebar__drive ${driveStatus?.connected ? 'sidebar__drive--connected' : ''}`}
                id="sidebar-drive-status"
            >
                <span className={`sidebar__drive-dot ${driveStatus?.connected ? 'sidebar__drive-dot--on' : 'sidebar__drive-dot--off'}`} />
                {!isCollapsed && (
                    <div className="sidebar__drive-info">
                        <span className="sidebar__drive-label">
                            {driveStatus?.connected ? 'Drive Terhubung' : 'Drive Terputus'}
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
