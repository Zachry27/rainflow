import React, { useState, useCallback, useRef } from 'react'
import { Sparkles, Bot, Image as ImageIcon, Rocket, RefreshCw, Square, CheckCircle, XCircle, Clock } from 'lucide-react'
import PromptPresets from './PromptPresets'

// Promise pool — execute `tasks` with max `concurrency` at a time
async function runPool(tasks, concurrency, onProgress) {
    const results = []
    let nextIndex = 0
    let running = 0

    return new Promise((resolve) => {
        function runNext() {
            while (running < concurrency && nextIndex < tasks.length) {
                const index = nextIndex++
                running++
                tasks[index]()
                    .then(result => {
                        results[index] = result
                        running--
                        onProgress && onProgress(index, result)
                        runNext()
                        if (running === 0 && nextIndex >= tasks.length) {
                            resolve(results)
                        }
                    })
            }
        }
        runNext()
        if (tasks.length === 0) resolve(results)
    })
}

export default function StepGenerate({ images, onImagesChange, settings, onUpdateSettings, outputNames, onComplete }) {
    const [generating, setGenerating] = useState(false)
    const [apiStatus, setApiStatus] = useState('checking') // 'checking', 'connected', 'error'
    const abortRef = useRef(false)

    const totalImages = images.length
    const doneCount = images.filter(img => img.status === 'done').length
    const errorCount = images.filter(img => img.status === 'error').length
    const pendingCount = images.filter(img => img.status === 'pending' || img.status === 'error').length
    const generatingCount = images.filter(img => img.status === 'generating').length

    // Convert image file to base64 data URL
    const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })

    // Generate video for a single image item
    const generateOne = useCallback(async (img, outputName) => {
        if (abortRef.current) return { success: false, error: 'Dibatalkan' }

        // Mark as generating
        onImagesChange(prev => prev.map(m =>
            m.id === img.id ? { ...m, status: 'generating', error: null } : m
        ))

        try {
            let imageDataUrl = null
            try {
                imageDataUrl = await fileToDataUrl(img.file)
            } catch (e) {
                throw new Error('Gagal membaca file gambar')
            }

            const apiUrl = settings.apiUrl.replace(/\/$/, '')
            const response = await fetch(`${apiUrl}/v1/videos/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`,
                },
                body: JSON.stringify({
                    prompt: settings.prompt,
                    model: 'grok-2-video',
                    aspect_ratio: settings.aspectRatio,
                    duration_seconds: settings.duration,
                    resolution: settings.resolution,
                    preset: settings.preset,
                    image: imageDataUrl,
                    output_filename: outputName,
                }),
                signal: AbortSignal.timeout(settings.duration === 10 ? 300000 : 240000), // 4-5 min timeout
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error')
                throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`)
            }

            const result = await response.json()
            const videoUrl = result.data?.[0]?.url || null

            onImagesChange(prev => prev.map(m =>
                m.id === img.id ? { ...m, status: 'done', videoUrl, error: null } : m
            ))

            return { success: true, videoUrl }
        } catch (err) {
            const errMsg = err.name === 'TimeoutError' ? 'Timeout — coba lagi' : err.message
            onImagesChange(prev => prev.map(m =>
                m.id === img.id ? { ...m, status: 'error', error: errMsg } : m
            ))
            return { success: false, error: errMsg }
        }
    }, [settings, onImagesChange])

    // Start parallel batch generation
    const startGeneration = useCallback(async () => {
        setGenerating(true)
        abortRef.current = false

        const pendingItems = images
            .map((img, index) => ({ img, index }))
            .filter(({ img }) => img.status === 'pending' || img.status === 'error')

        const workers = Math.max(1, Math.min(settings.workers || 3, pendingItems.length))

        const tasks = pendingItems.map(({ img, index }) => async () => {
            if (abortRef.current) return
            const outputName = outputNames[index] || `video_${index}`
            return generateOne(img, outputName)
        })

        await runPool(tasks, workers, null)

        setGenerating(false)
    }, [images, outputNames, generateOne, settings.workers])

    const stopGeneration = useCallback(() => {
        abortRef.current = true
        // Reset generating items back to pending
        onImagesChange(prev => prev.map(img =>
            img.status === 'generating' ? { ...img, status: 'pending', error: null } : img
        ))
        setGenerating(false)
    }, [onImagesChange])

    const retryFailed = useCallback(() => {
        onImagesChange(prev => prev.map(img =>
            img.status === 'error' ? { ...img, status: 'pending', error: null } : img
        ))
    }, [onImagesChange])

    // Trigger onComplete when all done
    const allDone = totalImages > 0 && images.every(img => img.status === 'done')
    React.useEffect(() => {
        if (allDone && !generating) onComplete()
    }, [allDone, generating, onComplete])

    // Check API Connection
    React.useEffect(() => {
        let mounted = true
        const checkConnection = async () => {
            setApiStatus('checking')
            try {
                // Remove trailing slash to prevent CORS/redirect issues
                const url = settings.apiUrl.replace(/\/$/, '')
                // Some backends might not allow root /, so we can just check if it resolves or returns an HTTP status
                const res = await fetch(url, { method: 'GET' })
                if (mounted) {
                    setApiStatus(res.ok || res.status === 404 || res.status === 405 ? 'connected' : 'error')
                }
            } catch (err) {
                if (mounted) setApiStatus('error')
            }
        }
        
        // Add a slight debounce to avoid spamming if user is typing the URL
        const timer = setTimeout(checkConnection, 500)
        return () => { 
            mounted = false
            clearTimeout(timer)
        }
    }, [settings.apiUrl])

    if (images.length === 0) {
        return (
            <div className="card">
                <div className="empty-state">
                    <ImageIcon size={40} className="empty-state__icon" style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
                    <p className="empty-state__text">Import gambar dulu di Step 1</p>
                </div>
            </div>
        )
    }

    const progress = totalImages > 0 ? ((doneCount / totalImages) * 100) : 0
    const workers = settings.workers || 3

    return (
        <div>
            {/* Prompt Configuration */}
            <div className="card">
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={20} className="card__title-icon" style={{ color: '#a78bfa' }} />
                    Prompt & Konfigurasi AI
                </h3>
                <p className="card__desc">
                    Prompt ini digunakan untuk <strong>semua gambar</strong>. Gambar referensi dikirim sebagai input image-to-video.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-lighter)', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Backend API:</span>
                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '11px' }}>{settings.apiUrl}</code>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                        <span style={{ 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '50%', 
                            background: apiStatus === 'connected' ? 'var(--success)' : apiStatus === 'checking' ? '#f59e0b' : 'var(--error)',
                            boxShadow: apiStatus === 'connected' ? '0 0 8px var(--success)' : 'none',
                            transition: 'all 0.3s ease'
                        }} />
                        <span style={{ 
                            color: apiStatus === 'connected' ? 'var(--success)' : apiStatus === 'checking' ? '#f59e0b' : 'var(--error)', 
                            fontWeight: 600,
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {apiStatus === 'connected' ? 'Connected' : apiStatus === 'checking' ? 'Checking...' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                {/* Preset Manager */}
                <PromptPresets
                    currentPrompt={settings.prompt}
                    onApply={(p) => onUpdateSettings('prompt', p)}
                />

                <div className="settings-field" style={{ marginBottom: 16 }}>
                    <label className="settings-field__label">Video Prompt</label>
                    <textarea
                        className="prompt-area"
                        value={settings.prompt}
                        onChange={e => onUpdateSettings('prompt', e.target.value)}
                        placeholder="Describe the video you want to generate from the reference image..."
                        id="input-prompt"
                    />
                </div>

                <div className="gen-config">
                    <div className="settings-field">
                        <label className="settings-field__label">Aspect Ratio</label>
                        <select className="settings-field__select" value={settings.aspectRatio}
                            onChange={e => onUpdateSettings('aspectRatio', e.target.value)}>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="9:16">9:16 Shorts</option>
                            <option value="1:1">1:1 Square</option>
                        </select>
                    </div>
                    <div className="settings-field">
                        <label className="settings-field__label">Durasi</label>
                        <select className="settings-field__select" value={settings.duration}
                            onChange={e => onUpdateSettings('duration', Number(e.target.value))}>
                            <option value={6}>6 detik</option>
                            <option value={10}>10 detik</option>
                        </select>
                    </div>
                    <div className="settings-field">
                        <label className="settings-field__label">⚡ Workers</label>
                        <select className="settings-field__select" value={settings.workers}
                            onChange={e => onUpdateSettings('workers', Number(e.target.value))}>
                            {[1, 2, 3, 4, 5, 6].map(n => (
                                <option key={n} value={n}>{n} {n === 1 ? '(sequential)' : 'parallel'}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Progress & Controls */}
            <div className="card">
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={20} className="card__title-icon" style={{ color: 'var(--accent)' }} />
                    Step 2 — Generate Video dari Gambar
                </h3>

                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-card__value">{totalImages}</div>
                        <div className="stat-card__label">Total</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value" style={{ color: 'var(--accent)' }}>{generatingCount}</div>
                        <div className="stat-card__label">Berjalan</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value" style={{ color: 'var(--success)' }}>{doneCount}</div>
                        <div className="stat-card__label">Selesai</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value" style={{ color: 'var(--error)' }}>{errorCount}</div>
                        <div className="stat-card__label">Error</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar">
                    <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">
                    {generating
                        ? `⚡ Generating ${generatingCount} video secara paralel (${workers} workers)...`
                        : allDone
                            ? '✅ Semua video berhasil di-generate!'
                            : `${doneCount}/${totalImages} selesai`}
                </p>

                {/* Buttons */}
                <div className="btn-group">
                    {!generating ? (
                        <>
                            <button
                                className="btn btn--primary btn--full"
                                onClick={startGeneration}
                                disabled={pendingCount === 0}
                                id="btn-generate-all"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                                <Rocket size={18} /> {doneCount > 0 ? `Lanjutkan Generate (${pendingCount} sisa)` : `Generate ${totalImages} Video (${workers} parallel)`}
                            </button>
                            {errorCount > 0 && (
                                <button className="btn btn--outline" onClick={retryFailed} id="btn-retry-failed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <RefreshCw size={16} /> Retry Failed ({errorCount})
                                </button>
                            )}
                        </>
                    ) : (
                        <button className="btn btn--danger btn--full" onClick={stopGeneration} id="btn-stop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Square size={16} /> Stop Generation
                        </button>
                    )}
                </div>

                {/* Status List */}
                <div className="status-list" id="generation-status-list">
                    {images.map((img, index) => (
                        <div className={`status-item status-item--${img.status}`} key={img.id}>
                            <img className="status-item__thumb" src={img.preview} alt={img.name} />
                            <div className="status-item__info">
                                <p className="status-item__name">{outputNames[index] || img.name}</p>
                                <p className="status-item__detail" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {img.status === 'generating' && <><Clock size={12} /> Sedang generate video AI...</>}
                                    {img.status === 'done' && <><CheckCircle size={12} style={{ color: 'var(--success)' }} /> Video berhasil di-generate</>}
                                    {img.status === 'error' && <><XCircle size={12} style={{ color: 'var(--error)' }} /> {img.error || 'Error'}</>}
                                    {img.status === 'pending' && <><Clock size={12} /> Menunggu worker tersedia...</>}
                                </p>
                            </div>
                            <span className={`status-item__badge status-item__badge--${img.status}`}>
                                {img.status === 'generating' && <><span className="spinner" style={{ marginRight: 4 }} />Gen...</>}
                                {img.status === 'done' && '✓ Done'}
                                {img.status === 'error' && '✕ Error'}
                                {img.status === 'pending' && 'Wait'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
