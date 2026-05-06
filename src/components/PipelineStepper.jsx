import React from 'react'

const STEPS = [
    { id: 'upload',   num: 1, label: 'Import',   icon: '📁' },
    { id: 'generate', num: 2, label: 'Generate', icon: '🤖' },
    { id: 'process',  num: 3, label: 'Process',  icon: '🔁' },
    { id: 'export',   num: 4, label: 'Export',   icon: '📦' },
]

export default function PipelineStepper({ activeStep, completedSteps, onStepChange }) {
    const activeIdx = STEPS.findIndex(s => s.id === activeStep)

    return (
        <div className="pipeline-stepper" id="pipeline-stepper" role="navigation" aria-label="Pipeline steps">
            {STEPS.map((step, idx) => {
                const isActive = activeStep === step.id
                const isDone = completedSteps?.[step.id]
                const isPast = idx < activeIdx

                let statusClass = ''
                if (isActive) statusClass = 'pipeline-step--active'
                else if (isDone || isPast) statusClass = 'pipeline-step--done'
                else statusClass = 'pipeline-step--pending'

                return (
                    <React.Fragment key={step.id}>
                        <button
                            className={`pipeline-step ${statusClass}`}
                            onClick={() => onStepChange(step.id)}
                            id={`stepper-${step.id}`}
                            aria-current={isActive ? 'step' : undefined}
                        >
                            <div className="pipeline-step__circle">
                                {isDone && !isActive
                                    ? <span className="pipeline-step__check">✓</span>
                                    : <span className="pipeline-step__num">{step.num}</span>
                                }
                            </div>
                            <div className="pipeline-step__info">
                                <span className="pipeline-step__icon">{step.icon}</span>
                                <span className="pipeline-step__label">{step.label}</span>
                            </div>
                        </button>

                        {idx < STEPS.length - 1 && (
                            <div className={`pipeline-connector ${isDone || isPast ? 'pipeline-connector--done' : ''}`} />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}
