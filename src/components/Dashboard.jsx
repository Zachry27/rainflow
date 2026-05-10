import React, { useState, useEffect } from 'react'
import { Server, Activity, Image as ImageIcon, Video, RefreshCw, UploadCloud, FolderOpen, Settings, Clock, Inbox, Cpu, RotateCcw } from 'lucide-react'

export default function Dashboard({ images, completedSteps, driveStatus, onStepChange, onOpenSettings, onOpenStorage, onResetWorkflow }) {
    const [backendStatus, setBackendStatus] = useState({ benalus: 'checking', python: 'checking' })
    const [uploadHistory, setUploadHistory] = useState([])

    const totalImages = images.length
    const generatedVideos = images.filter(img => img.status === 'done').length
    const loopedVideos = images.filter(img => img.videoUrl && img.videoUrl.includes('/downloads/')).length
    const uploadedCount = uploadHistory.length

    const [systemStats, setSystemStats] = useState({ cpu: 0, memory: { used: 0, total: 0 }, network: { rx_sec: 0, tx_sec: 0 } })

    useEffect(() => {
        // Load upload history
        try {
            const saved = JSON.parse(localStorage.getItem('rainflowUploadHistory') || '[]')
            setUploadHistory(saved)
        } catch (e) {}

        const checkBackends = async () => {
            const checkBenAlus = fetch('/api/settings', { method: 'GET' })
                .then(r => r.ok ? 'online' : 'offline')
                .catch(() => 'offline')

            const checkPython = fetch('/v1/health')
                .then(r => r.ok ? 'online' : 'offline')
                .catch(() => 'offline')

            const [benalus, python] = await Promise.all([checkBenAlus, checkPython])
            setBackendStatus({ benalus, python })
        }

        checkBackends()

        // Fetch System Stats periodically
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/system-stats')
                if (res.ok) {
                    const data = await res.json()
                    setSystemStats(data)
                }
            } catch (e) {}
        }
        
        fetchStats()
        const statInterval = setInterval(() => {
            fetchStats()
            checkBackends()
        }, 3000)

        return () => clearInterval(statInterval)
    }, [])

    const steps = [
        { id: 'upload',   icon: <ImageIcon size={20} />, label: 'Import Gambar',    count: totalImages,     unit: 'gambar',  color: 'var(--accent)' },
        { id: 'generate', icon: <Video size={20} />, label: 'Generate Video',   count: generatedVideos,  unit: 'video',   color: '#a78bfa' },
        { id: 'process',  icon: <RefreshCw size={20} />, label: 'Seamless Loop',    count: loopedVideos,     unit: 'selesai', color: '#34d399' },
        { id: 'export',   icon: <UploadCloud size={20} />, label: 'Upload Drive',      count: uploadedCount,    unit: 'terupload', color: '#fb923c' },
    ]

    const StatusDot = ({ status }) => (
        <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6,
            background: status === 'online' ? '#10b981' : status === 'checking' ? '#f59e0b' : '#ef4444',
            boxShadow: status === 'online' ? '0 0 6px #10b981' : 'none',
        }} />
    )

    return (
        <div>
            {/* Hero */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.1) 100%)', borderColor: 'rgba(99,102,241,0.3)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div style={{ padding: 10, background: 'rgba(99,102,241,0.2)', borderRadius: 12, color: 'var(--primary-light)' }}>
                        <Activity size={28} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>RainFlow Dashboard</h2>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                            YouTube Content Creator Pipeline — Gambar → Video AI → Loop → Drive
                        </p>
                    </div>
                </div>

                {/* Pipeline Progress Cards */}
                <div className="stats-row">
                    {steps.map(step => (
                        <div
                            key={step.id}
                            className="stat-card"
                            onClick={() => onStepChange(step.id)}
                            style={{ cursor: 'pointer', transition: 'transform 0.15s', borderColor: completedSteps[step.id] ? step.color : undefined }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = ''}
                        >
                            <div style={{ marginBottom: 8, color: step.color }}>{step.icon}</div>
                            <div className="stat-card__value" style={{ color: step.color, fontSize: 28 }}>
                                {step.count}
                            </div>
                            <div className="stat-card__label">{step.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{step.unit}</div>
                            {completedSteps[step.id] && (
                                <div style={{ fontSize: 10, color: step.color, marginTop: 4, fontWeight: 600 }}>✓ Selesai</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Backend Status + Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Backend Status */}
                <div className="card">
                    <h3 className="card__title" style={{ marginBottom: 16 }}>
                        <Server size={18} className="card__title-icon" style={{ color: 'var(--primary-light)' }} />
                        Status Server
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13 }}>
                                <StatusDot status={backendStatus.benalus} />
                                BenAlus (FFmpeg) <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>:3000</span>
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: backendStatus.benalus === 'online' ? '#10b981' : '#ef4444' }}>
                                {backendStatus.benalus === 'online' ? 'Online' : backendStatus.benalus === 'checking' ? 'Memeriksa...' : 'Offline'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13 }}>
                                <StatusDot status={backendStatus.python} />
                                RainFlow AI <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>:9564</span>
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: backendStatus.python === 'online' ? '#10b981' : '#ef4444' }}>
                                {backendStatus.python === 'online' ? 'Online' : backendStatus.python === 'checking' ? 'Memeriksa...' : 'Offline'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13 }}>
                                <StatusDot status={driveStatus?.connected ? 'online' : 'offline'} />
                                Google Drive
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: driveStatus?.connected ? '#10b981' : '#ef4444' }}>
                                {driveStatus?.connected ? driveStatus.email || 'Terhubung' : 'Tidak terhubung'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="card__title" style={{ marginBottom: 16 }}>
                        <Activity size={18} className="card__title-icon" style={{ color: 'var(--accent)' }} />
                        Aksi Cepat
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button className="btn btn--primary btn--sm" onClick={() => onStepChange('upload')} style={{ justifyContent: 'flex-start', gap: 8 }}>
                            <ImageIcon size={16} /> Import Gambar Baru
                        </button>
                        <button className="btn btn--outline btn--sm" onClick={onOpenStorage} style={{ justifyContent: 'flex-start', gap: 8 }}>
                            <FolderOpen size={16} /> Lihat Storage & Riwayat
                        </button>
                        <button className="btn btn--outline btn--sm" onClick={onOpenSettings} style={{ justifyContent: 'flex-start', gap: 8 }}>
                            <Settings size={16} /> Pengaturan
                        </button>
                        <button className="btn btn--danger btn--sm" onClick={onResetWorkflow} style={{ justifyContent: 'flex-start', gap: 8 }}>
                            <RotateCcw size={16} /> Reset & Mulai Step 1
                        </button>
                    </div>
                </div>
            </div>

            {/* System Stats (Realtime) */}
            <div className="card">
                <h3 className="card__title" style={{ marginBottom: 16 }}>
                    <Cpu size={18} className="card__title-icon" style={{ color: 'var(--success)' }} />
                    System Resource
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                    <div style={{ background: 'var(--bg-lighter)', padding: 16, borderRadius: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>CPU Usage</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                            {systemStats.cpu ? systemStats.cpu.toFixed(1) : 0}%
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-lighter)', padding: 16, borderRadius: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Memory</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                            {systemStats.memory.used ? (systemStats.memory.used / 1e9).toFixed(2) : 0} GB
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 4 }}>
                                / {systemStats.memory.total ? (systemStats.memory.total / 1e9).toFixed(2) : 0} GB
                            </span>
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-lighter)', padding: 16, borderRadius: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Internet Speed</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>↑ Upload</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                    {systemStats.network.tx_sec ? (systemStats.network.tx_sec / 1024).toFixed(1) : 0} KB/s
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>↓ Download</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                    {systemStats.network.rx_sec ? (systemStats.network.rx_sec / 1024).toFixed(1) : 0} KB/s
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload History */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 className="card__title" style={{ margin: 0 }}>
                        <Clock size={18} className="card__title-icon" style={{ color: 'var(--warning)' }} />
                        Riwayat Upload Terakhir
                    </h3>
                    {uploadHistory.length > 0 && (
                        <button className="btn btn--outline btn--sm" onClick={onOpenStorage}>Lihat Semua</button>
                    )}
                </div>
                {uploadHistory.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px 0' }}>
                        <Inbox size={40} className="empty-state__icon" style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
                        <p className="empty-state__text">Belum ada riwayat upload. Upload video pertama Anda!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {uploadHistory.slice(0, 5).map((h, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px', background: 'var(--bg-lighter)', borderRadius: 8, gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <Video size={18} style={{ color: 'var(--text-muted)' }} />
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{h.name}</p>
                                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                                <a href={h.url} target="_blank" rel="noreferrer" className="btn btn--sm btn--outline" style={{ flexShrink: 0, gap: 6 }}>
                                    <UploadCloud size={14} /> Drive
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
