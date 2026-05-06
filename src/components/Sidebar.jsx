import React from 'react'
import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
    { id: 'upload',   icon: '📁', label: 'Import',   shortLabel: 'Import' },
    { id: 'generate', icon: '🤖', label: 'Generate', shortLabel: 'Generate' },
    { id: 'process',  icon: '🔁', label: 'Process',  shortLabel: 'Process' },
    { id: 'export',   icon: '📦', label: 'Export',   shortLabel: 'Export' },
]

const UTILITY_ITEMS = [
    { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export default function Sidebar({
    activeStep,
    onStepChange,
    completedSteps,
    imageCount,
    driveStatus,      // { connected: bool, name: string, email: string }
    isOpen,
    isCollapsed,
    onToggleCollapse,
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

            {/* Pipeline section */}
            <div className="sidebar__section">
                {!isCollapsed && (
                    <span className="sidebar__section-label">Pipeline</span>
                )}
                <nav className="sidebar__nav" id="sidebar-nav">
                    {NAV_ITEMS.map((item, idx) => {
                        const isActive = activeStep === item.id
                        const isDone = completedSteps?.[item.id]
                        return (
                            <button
                                key={item.id}
                                className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''} ${isDone && !isActive ? 'sidebar__nav-item--done' : ''}`}
                                onClick={() => onStepChange(item.id)}
                                id={`sidebar-step-${item.id}`}
                                title={isCollapsed ? item.label : ''}
                            >
                                <span className="sidebar__nav-step-num">
                                    {isDone && !isActive ? '✓' : idx + 1}
                                </span>
                                <span className="sidebar__nav-icon">{item.icon}</span>
                                {!isCollapsed && (
                                    <span className="sidebar__nav-label">{item.label}</span>
                                )}
                                {isActive && <span className="sidebar__nav-indicator" />}
                            </button>
                        )
                    })}
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
