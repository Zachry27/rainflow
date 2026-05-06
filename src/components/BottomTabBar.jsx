import React from 'react'

const TABS = [
    { id: 'upload',   icon: '📁', label: 'Import' },
    { id: 'generate', icon: '🤖', label: 'Generate' },
    { id: 'process',  icon: '🔁', label: 'Process' },
    { id: 'export',   icon: '📦', label: 'Export' },
]

export default function BottomTabBar({ activeStep, onStepChange, completedSteps }) {
    return (
        <nav className="bottom-tab-bar" id="bottom-tab-bar" aria-label="Main navigation">
            {TABS.map((tab) => {
                const isActive = activeStep === tab.id
                const isDone = completedSteps?.[tab.id]
                return (
                    <button
                        key={tab.id}
                        className={`bottom-tab ${isActive ? 'bottom-tab--active' : ''} ${isDone && !isActive ? 'bottom-tab--done' : ''}`}
                        onClick={() => onStepChange(tab.id)}
                        id={`bottom-tab-${tab.id}`}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <span className="bottom-tab__icon">{tab.icon}</span>
                        <span className="bottom-tab__label">{tab.label}</span>
                        {isActive && <span className="bottom-tab__indicator" />}
                        {isDone && !isActive && <span className="bottom-tab__done-dot" />}
                    </button>
                )
            })}
        </nav>
    )
}
