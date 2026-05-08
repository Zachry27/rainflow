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
import StorageManager from './components/StorageManager'
import Dashboard from './components/Dashboard'
import InstallPrompt from './components/InstallPrompt'

export default function MainApp() {
    const [activeStep, setActiveStep] = useState('dashboard')
    const [images, setImages] = useState([])
    const [driveToken, setDriveToken] = useState(null)
    const [driveUser, setDriveUser] = useState(null)   // { name, email }
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isStorageOpen, setIsStorageOpen] = useState(false)
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
            processMode: 'benalus',
            enableDeflicker: true,
            enableStabilization: false,
            fadeDuration: 0.8,
            videoDuration: 6,
            namePrefix: 'crs',
            startDate: '',
            autoUploadAndDelete: true,
            parallelLimit: 4,
            loopMode: 'alpha_fade',
            outputType: 'hours',
            outputCount: 6,
            outputHours: 3,
            enableAudio: false,
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

    React.useEffect(() => {
        fetch('/api/app-data/settings')
            .then(res => res.json())
            .then(res => {
                if (res.data) {
                    setSettings(prev => ({ ...prev, ...res.data }))
                }
            })
            .catch(err => console.error('Failed to load settings from server', err))
    }, [])

    const saveSettingsToDefault = useCallback(() => {
        try {
            localStorage.setItem('rainflowMainSettings', JSON.stringify(settings))
            fetch('/api/app-data/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: settings })
            }).catch(() => {})
            showToast('✅ Pengaturan berhasil disimpan ke Server!')
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

    const handleJobCompleted = useCallback(async (job, img, outputName) => {
        if (!settings.autoUploadAndDelete || !driveToken) return;
        
        try {
            showToast(`⏳ Auto-uploading ${outputName} ke Drive...`);

            // 1) Download video dari BenAlus (lewat proxy /downloads, port 3000)
            const videoRes = await fetch(job.resultUrl);
            if (!videoRes.ok) throw new Error(`Download gagal: HTTP ${videoRes.status}`);
            const videoBlob = await videoRes.blob();

            // 2) Upload langsung ke Google Drive API dari browser (tanpa backend Python)
            const metadata = {
                name: `${outputName}.mp4`,
                mimeType: 'video/mp4',
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', videoBlob);

            const driveRes = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${driveToken}` },
                    body: form,
                }
            );

            if (!driveRes.ok) {
                const errText = await driveRes.text().catch(() => '');
                throw new Error(`Drive upload gagal: HTTP ${driveRes.status} ${errText.slice(0, 100)}`);
            }

            const driveResult = await driveRes.json();
            const driveUrl = driveResult.webViewLink || `https://drive.google.com/file/d/${driveResult.id}/view`;

            // 3) Simpan ke history (localStorage)
            try {
                const history = JSON.parse(localStorage.getItem('rainflowUploadHistory') || '[]');
                history.unshift({
                    name: `${outputName}.mp4`,
                    date: new Date().toISOString(),
                    url: driveUrl,
                });
                localStorage.setItem('rainflowUploadHistory', JSON.stringify(history));
            } catch (e) {}

            // 4) Hapus file lokal dari BenAlus server
            const filename = job.resultUrl.split('/').pop();
            if (filename) {
                await fetch(`/api/file/${encodeURIComponent(filename)}`, { method: 'DELETE' }).catch(() => {});
            }

            showToast(`✅ ${outputName} → Drive berhasil & lokal dihapus!`);
        } catch (err) {
            console.error('Auto upload error:', err);
            showToast(`Gagal auto-upload ${outputName}: ${err.message}`, true);
        }
    }, [settings.autoUploadAndDelete, driveToken, showToast]);

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
                onOpenSettings={() => { setIsSettingsOpen(true); setIsSidebarOpen(false) }}
                onOpenStorage={() => { setIsStorageOpen(true); setIsSidebarOpen(false) }}
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

                {/* Drive status chip — mobile only */}
                <div className="drive-chip-bar">
                    <GoogleDrive onTokenChange={setDriveToken} onUserChange={setDriveUser} compact />
                </div>

                {/* Pipeline Stepper — hanya tampil saat di step pipeline */}
                {activeStep !== 'dashboard' && (
                    <PipelineStepper
                        activeStep={activeStep}
                        completedSteps={completedSteps}
                        onStepChange={setActiveStep}
                    />
                )}

                {/* Dashboard */}
                {activeStep === 'dashboard' && (
                    <Dashboard
                        images={images}
                        completedSteps={completedSteps}
                        driveStatus={driveStatus}
                        onStepChange={setActiveStep}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onOpenStorage={() => setIsStorageOpen(true)}
                    />
                )}

                {/* Step content — all mounted, show/hide via CSS */}
                <div style={{ display: activeStep === 'upload' ? 'block' : 'none' }}>
                    <StepUpload
                        images={images}
                        onImagesChange={handleImagesChange}
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        outputNames={getOutputNames()}
                        driveAccessToken={driveToken}
                        isActive={activeStep === 'upload'}
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
                        isActive={activeStep === 'generate'}
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
                        onJobCompleted={handleJobCompleted}
                        isActive={activeStep === 'process'}
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
                        isActive={activeStep === 'export'}
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

            {/* ── Storage Manager Sheet ── */}
            <StorageManager
                isOpen={isStorageOpen}
                onClose={() => setIsStorageOpen(false)}
            />

            {/* ── PWA Install Prompt ── */}
            <InstallPrompt />
        </div>
    )
}
