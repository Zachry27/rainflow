import React from 'react'

const STEPS = [
    { id: 'upload', num: '1', label: 'Import Gambar', icon: '📁' },
    { id: 'generate', num: '2', label: 'Generate Video', icon: '🤖' },
    { id: 'process', num: '3', label: 'FFmpeg Process', icon: '🔁' },
    { id: 'export', num: '4', label: 'Export', icon: '📦' },
]

export default function PipelineNav({ activeStep, onStepChange, completedSteps, imageCount }) {
    return (
        <nav className="pipeline-nav" id="pipeline-nav">
            {STEPS.map((step) => {
                const isActive = activeStep === step.id
                const isDone = completedSteps[step.id]
                let classes = 'pipeline-btn'
                if (isActive) classes += ' pipeline-btn--active'
                if (isDone && !isActive) classes += ' pipeline-btn--done'

                return (
                    <button
                        key={step.id}
                        className={classes}
                        onClick={() => onStepChange(step.id)}
                        id={`step-${step.id}`}
                    >
                        <span className="pipeline-btn__num">
                            {isDone && !isActive ? '✓' : step.num}
                        </span>
                        <span className="pipeline-btn__label">
                            {step.icon} {step.label}
                        </span>
                    </button>
                )
            })}
        </nav>
    )
}
