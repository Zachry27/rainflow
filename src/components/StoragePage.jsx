import React, { useState, useEffect } from 'react'
import { HardDrive, Clock, Trash2, FolderOpen, RefreshCw, Eye, FileVideo, X } from 'lucide-react'

export default function StoragePage() {
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState([])
    const [toast, setToast] = useState(null)
    const [confirmAction, setConfirmAction] = useState(null)
    const [previewFile, setPreviewFile] = useState(null)

    useEffect(() => {
        fetchFiles()
        loadHistory()
    }, [])

    const showToast = (msg, isError = false) => {
        setToast({ msg, isError })
        setTimeout(() => setToast(null), 3000)
    }

    const fetchFiles = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/uploads')
            const data = await res.json()
            if (data.files) setFiles(data.files)
        } catch (err) {}
        setLoading(false)
    }

    const loadHistory = () => {
        try {
            const saved = localStorage.getItem('rainflowUploadHistory')
            if (saved) setHistory(JSON.parse(saved))
        } catch (e) {}
    }

    const clearHistory = () => {
        setConfirmAction({
            message: 'Yakin ingin menghapus semua riwayat upload?',
            onConfirm: () => {
                localStorage.removeItem('rainflowUploadHistory')
                setHistory([])
                showToast('Riwayat berhasil dihapus.')
            }
        })
    }

    const deleteFile = (filename) => {
        setConfirmAction({
            message: `Hapus file "${filename}" dari server?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/file/${encodeURIComponent(filename)}`, { method: 'DELETE' })
                    if (res.ok) {
                        showToast(`File "${filename}" dihapus.`)
                        fetchFiles()
                    } else {
                        showToast('Gagal menghapus file.', true)
                    }
                } catch (err) {
                    showToast('Gagal hapus file: ' + err.message, true)
                }
            }
        })
    }

    const clearAllFiles = () => {
        setConfirmAction({
            message: 'Hapus SEMUA file hasil dan temporary di server BenAlus?',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/clear-uploads', { method: 'DELETE' })
                    if (res.ok) {
                        const data = await res.json()
                        showToast(`Berhasil menghapus ${data.deleted} file.`)
                        fetchFiles()
                    } else {
                        showToast('Gagal membersihkan file.', true)
                    }
                } catch (err) {
                    showToast('Error: ' + err.message, true)
                }
            }
        })
    }

    const openPreview = (filename) => {
        const isVideo = filename.toLowerCase().endsWith('.mp4')
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename)
        if (!isVideo && !isImage) {
            showToast('Format file ini tidak dapat di-preview', true)
            return
        }
        setPreviewFile({
            name: filename,
            url: `/downloads/${filename}`,
            type: isVideo ? 'video' : 'image'
        })
    }

    const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    return (
        <div>
            <div className="card">
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HardDrive size={20} className="card__title-icon" />
                    Storage & Riwayat
                </h3>

                {toast && (
                    <div style={{
                        marginBottom: 12,
                        padding: '10px 16px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        background: toast.isError ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        color: toast.isError ? '#f87171' : '#34d399',
                        border: `1px solid ${toast.isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    }}>
                        {toast.msg}
                    </div>
                )}

                {confirmAction && (
                    <div style={{
                        marginBottom: 12,
                        padding: '14px 16px',
                        borderRadius: 8,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                    }}>
                        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5 }}>{confirmAction.message}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn--danger btn--sm" onClick={() => { confirmAction.onConfirm(); setConfirmAction(null) }}>
                                Ya, hapus
                            </button>
                            <button className="btn btn--outline btn--sm" onClick={() => setConfirmAction(null)}>
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 className="card__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={16} className="card__title-icon" />
                            Riwayat Upload ke Drive
                        </h4>
                        {history.length > 0 && (
                            <button className="btn btn--danger btn--sm" onClick={clearHistory}>
                                <Trash2 size={14} style={{ marginRight: 6 }} /> Hapus Semua
                            </button>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada riwayat upload.</p>
                    ) : (
                        <div className="status-list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                            {history.map((h, i) => (
                                <div key={i} className="status-item status-item--done" style={{ padding: 8 }}>
                                    <div className="status-item__info">
                                        <p className="status-item__name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <FileVideo size={16} /> {h.name}
                                        </p>
                                        <p className="status-item__detail">
                                            {new Date(h.date).toLocaleString('id-ID')} • <a href={h.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: 4 }}>Lihat di Drive</a>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 className="card__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FolderOpen size={16} className="card__title-icon" />
                            File di Server BenAlus
                        </h4>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn--outline btn--sm" onClick={fetchFiles} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RefreshCw size={14} /> Refresh
                            </button>
                            {files.length > 0 && (
                                <button className="btn btn--danger btn--sm" onClick={clearAllFiles} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Trash2 size={14} /> Bersihkan Semua
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat...</p>
                    ) : files.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Penyimpanan kosong.</p>
                    ) : (
                        <div className="status-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {files.map((f, i) => (
                                <div key={i} className="status-item" style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="status-item__info" style={{ flex: 1, minWidth: 0 }}>
                                        <p className="status-item__name" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={f.name}>
                                            {f.name}
                                        </p>
                                        <p className="status-item__detail">
                                            {formatSize(f.size)} • {new Date(f.createdAt).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn--sm btn--outline" onClick={() => openPreview(f.name)} style={{ padding: '6px' }} title="Preview File">
                                            <Eye size={16} />
                                        </button>
                                        <button className="btn btn--sm" onClick={() => deleteFile(f.name)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '6px' }} title="Hapus File">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {previewFile && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1002,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', padding: 20
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {previewFile.name}
                        </h3>
                        <button className="btn btn--sm" onClick={() => setPreviewFile(null)} style={{ color: 'white', padding: 4 }}>
                            <X size={24} />
                        </button>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {previewFile.type === 'video' ? (
                            <video src={previewFile.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
                        ) : (
                            <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
