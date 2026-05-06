import React, { useState, useCallback } from 'react'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import BottomTabBar from './components/BottomTabBar'
import PipelineStepper from './components/PipelineStepper'
import SettingsSheet from './components/SettingsSheet'
import GoogleDrive from './components/GoogleDrive'
import StepUpload from './components/StepUpload'
import StepGenerate from './components/StepGenerate'
import StepProcess from './components/StepProcess'
import StepExport from './components/StepExport'

export default function MainApp() {
    const [activeStep, setActiveStep] = useState('upload')
    const [images, setImages] = useState([])
    const [driveToken, setDriveToken] = useState(null)
    const [driveUser, setDriveUser] = useState(null)   // { name, email }
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [manualVideos, setManualVideos] = useState([])
    const [toastMessage, setToastMessage] = useState(null)

    const [settings, setSettings] = useState(() => {
        const defaultSettings = {
            apiUrl: import.meta.env.VITE_GROKPI_API_URL || '',
            apiKey: import.meta.env.VITE_GROKPI_API_KEY || 'rainflow-secret',
            prompt: '',
            duration: 6,
            resolution: '480p',
            preset: 'normal',
            workers: 3,
            loopDuration: 10800,
            crf: 23,
            audioFile: 'rain_audio.mp3',
            processMode: 'standard',
            enableDeflicker: true,
            enableStabilization: false,
            fadeDuration: 0.8,
            videoDuration: 6,
            namePrefix: 'crs',
            startDate: '',
        }
        try {
            const saved = localStorage.getItem('rainflowMainSettings')
            if (saved) return { ...defaultSettings, ...JSON.parse(saved) }
        } catch (e) {}
        return defaultSettings
    })

    const [completedSteps, setCompletedSteps] = useState({
        upload: false, generate: false, process: false, export: false,
    })

    const showToast = useCallback((msg, isError = false) => {
        setToastMessage({ text: msg, isError })
        setTimeout(() => setToastMessage(null), 3500)
    }, [])

    const saveSettingsToDefault = useCallback(() => {
        try {
            localStorage.setItem('rainflowMainSettings', JSON.stringify(settings))
            showToast('✅ Pengaturan berhasil disimpan sebagai default!')
        } catch (e) {
            showToast('Gagal menyimpan: ' + e.message, true)
        }
    }, [settings, showToast])

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

    const driveStatus = {
        connected: !!driveToken,
        name: driveUser?.name || '',
        email: driveUser?.email || '',
    }

    return (
        <div className={`app-layout ${isSidebarCollapsed ? 'app-layout--collapsed' : ''} ${isSidebarOpen ? 'app-layout--sidebar-open' : ''}`}>

            {/* ── Toast ── */}
            {toastMessage && (
                <div className={`toast ${toastMessage.isError ? 'toast--error' : 'toast--success'}`} id="toast-notification">
                    {toastMessage.text}
                </div>
            )}

            {/* ── Topbar ── */}
            <Topbar
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                activeStep={activeStep}
                isSidebarOpen={isSidebarOpen}
            />

            {/* ── Sidebar (desktop) ── */}
            <Sidebar
                activeStep={activeStep}
                onStepChange={(step) => { setActiveStep(step); setIsSidebarOpen(false) }}
                completedSteps={completedSteps}
                imageCount={images.length}
                driveStatus={driveStatus}
                isOpen={isSidebarOpen}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* ── Mobile overlay backdrop ── */}
            {isSidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setIsSidebarOpen(false)}
                    id="sidebar-backdrop"
                />
            )}

            {/* ── Main Content ── */}
            <main className="main-content" id="main-content">

                {/* Drive status chip — shown on mobile only, hidden on desktop (sidebar handles it) */}
                <div className="drive-chip-bar">
                    <GoogleDrive onTokenChange={setDriveToken} onUserChange={setDriveUser} compact />
                </div>

                {/* Pipeline Stepper */}
                <PipelineStepper
                    activeStep={activeStep}
                    completedSteps={completedSteps}
                    onStepChange={setActiveStep}
                />

                {/* Settings FAB button */}
                <button
                    className="settings-fab"
                    onClick={() => setIsSettingsOpen(true)}
                    id="settings-fab-btn"
                    title="Buka Pengaturan"
                >
                    ⚙️
                    <span className="settings-fab__label">Settings</span>
                </button>

                {/* Step content — all mounted, show/hide via CSS */}
                <div style={{ display: activeStep === 'upload' ? 'block' : 'none' }}>
                    <StepUpload
                        images={images}
                        onImagesChange={handleImagesChange}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        driveAccessToken={driveToken}
                    />
                </div>

                <div style={{ display: activeStep === 'generate' ? 'block' : 'none' }}>
                    <StepGenerate
                        images={images}
                        onImagesChange={setImages}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        onComplete={() => markStepDone('generate')}
                    />
                </div>

                <div style={{ display: activeStep === 'process' ? 'block' : 'none' }}>
                    <StepProcess
                        images={images}
                        onImagesChange={setImages}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        onComplete={() => markStepDone('process')}
                        manualVideos={manualVideos}
                        onManualVideosChange={setManualVideos}
                        driveAccessToken={driveToken}
                    />
                </div>

                <div style={{ display: activeStep === 'export' ? 'block' : 'none' }}>
                    <StepExport
                        images={images}
                        settings={settings}
                        outputNames={getOutputNames()}
                        driveToken={driveToken}
                        apiUrl={settings.apiUrl}
                        apiKey={settings.apiKey}
                    />
                </div>

                {/* Footer */}
                <footer className="footer">
                    <p className="footer__text">
                        🌊 RainFlow — Made with <span className="footer__heart">♥</span> for content creators
                    </p>
                </footer>
            </main>

            {/* ── Bottom Tab Bar (mobile) ── */}
            <BottomTabBar
                activeStep={activeStep}
                onStepChange={setActiveStep}
                completedSteps={completedSteps}
            />

            {/* ── Settings Bottom Sheet ── */}
            <SettingsSheet
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onUpdateSettings={updateSettings}
                onSaveSettings={saveSettingsToDefault}
                setDriveToken={setDriveToken}
                setDriveUser={setDriveUser}
            />
        </div>
    )
}
