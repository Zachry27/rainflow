import React, { useState, useCallback } from 'react'
import Header from './components/Header'
import Settings from './components/Settings'
import PipelineNav from './components/PipelineNav'
import GoogleDrive from './components/GoogleDrive'
import StepUpload from './components/StepUpload'
import StepGenerate from './components/StepGenerate'
import StepProcess from './components/StepProcess'
import StepExport from './components/StepExport'

export default function App() {
    const [activeStep, setActiveStep] = useState('upload')
    const [images, setImages] = useState([])
    const [driveToken, setDriveToken] = useState(null)
    const [settings, setSettings] = useState({
        apiUrl: 'http://127.0.0.1:9564',
        apiKey: 'rainflow-secret',
        prompt: 'Relaxing rain falling on a window with cozy ambient lighting, seamless loop, 4K quality',
        aspectRatio: '16:9',
        duration: 6,
        resolution: '480p',
        preset: 'normal',
        workers: 3,
        // FFmpeg settings
        loopDuration: 10800,
        crf: 23,
        audioFile: 'rain_audio.mp3',
        // BenAlus settings
        processMode: 'standard',
        enableDeflicker: true,
        enableStabilization: false,
        fadeDuration: 0.8,
        videoDuration: 6,
        // Naming settings
        namePrefix: 'crs',
        startDate: '',
    })
    const [manualVideos, setManualVideos] = useState([])

    // completedSteps: only visual indicator, NOT a navigation lock
    const [completedSteps, setCompletedSteps] = useState({
        upload: false,
        generate: false,
        process: false,
        export: false,
    })

    const markStepDone = useCallback((step) => {
        setCompletedSteps(prev => ({ ...prev, [step]: true }))
    }, [])

    const handleImagesChange = useCallback((newImages) => {
        setImages(newImages)
        if (newImages.length > 0) markStepDone('upload')
    }, [markStepDone])

    const updateSettings = useCallback((key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }, [])

    // Compute output names based on naming settings
    const getOutputNames = useCallback(() => {
        const prefix = settings.namePrefix || 'vid'
        let startDate
        if (settings.startDate) {
            startDate = new Date(settings.startDate)
        } else {
            startDate = new Date()
            startDate.setDate(startDate.getDate() + 1)
        }

        return images.map((_, index) => {
            const d = new Date(startDate)
            d.setDate(d.getDate() + index)
            const dd = String(d.getDate()).padStart(2, '0')
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            return `${prefix}${dd}${mm}`
        })
    }, [images, settings.namePrefix, settings.startDate])

    const renderStep = () => {
        switch (activeStep) {
            case 'upload':
                return (
                    <StepUpload
                        images={images}
                        onImagesChange={handleImagesChange}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        driveAccessToken={driveToken}
                    />
                )
            case 'generate':
                return (
                    <StepGenerate
                        images={images}
                        onImagesChange={setImages}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        onComplete={() => markStepDone('generate')}
                    />
                )
            case 'process':
                return (
                    <StepProcess
                        images={images}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        onComplete={() => markStepDone('process')}
                        manualVideos={manualVideos}
                        onManualVideosChange={setManualVideos}
                        driveAccessToken={driveToken}
                    />
                )
            case 'export':
                return (
                    <StepExport
                        images={images}
                        settings={settings}
                        outputNames={getOutputNames()}
                        driveToken={driveToken}
                        apiUrl={settings.apiUrl}
                        apiKey={settings.apiKey}
                    />
                )
            default:
                return null
        }
    }

    return (
        <div className="app-container">
            <Header />

            {/* Google Drive connection bar */}
            <div style={{ padding: '0 0 8px' }}>
                <GoogleDrive onTokenChange={setDriveToken} />
            </div>

            <Settings settings={settings} onUpdateSettings={updateSettings} />
            <PipelineNav
                activeStep={activeStep}
                onStepChange={setActiveStep}
                completedSteps={completedSteps}
                imageCount={images.length}
            />
            {renderStep()}
            <footer className="footer">
                <p className="footer__text">
                    🌊 RainFlow — Made with <span className="footer__heart">♥</span> for content creators
                </p>
            </footer>
        </div>
    )
}
