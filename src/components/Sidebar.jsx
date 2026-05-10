import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, HardDrive, Settings, Image as ImageIcon, Video, RefreshCw, UploadCloud, Activity, Waves, ChevronLeft, ChevronRight, Check } from 'lucide-react'

const PIPELINE_STEPS = [
    { id: 'upload',   icon: <ImageIcon size={18} />, label: 'Import Gambar' },
    { id: 'generate', icon: <Video size={18} />, label: 'Generate Video' },
    { id: 'process',  icon: <RefreshCw size={18} />, label: 'Seamless Loop' },
    { id: 'export',   icon: <UploadCloud size={18} />, label: 'Export & Ringkasan' },
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
            <span className="sidebar__nav-icon">{isDone && !isActive ? <Check size={16} /> : icon}</span>
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
                <span className="sidebar__logo-icon" style={{ color: 'var(--primary-light)' }}><Waves size={24} /></span>
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
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
                        icon={<Home size={18} />}
                        label="Beranda"
                        onClick={() => onStepChange('dashboard')}
                        isActive={activeStep === 'dashboard'}
                    />
                    <NavItem
                        id="storage"
                        icon={<HardDrive size={18} />}
                        label="Storage & Riwayat"
                        onClick={() => onStepChange('storage')}
                        isActive={activeStep === 'storage'}
                    />
                    <NavItem
                        id="settings"
                        icon={<Settings size={18} />}
                        label="Pengaturan"
                        onClick={() => onStepChange('settings')}
                        isActive={activeStep === 'settings'}
                    />
                    <NavItem
                        id="logs"
                        icon={<Activity size={18} />}
                        label="Log Aktivitas"
                        onClick={() => onStepChange('logs')}
                        isActive={activeStep === 'logs'}
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
                            icon={<Activity size={18} />}
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
