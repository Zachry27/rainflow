import React, { useState, useEffect } from 'react';

export default function StorageManager({ isOpen, onClose }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [toast, setToast] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm }

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
            loadHistory();
        }
    }, [isOpen]);

    const showToast = (msg, isError = false) => {
        setToast({ msg, isError });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/uploads');
            const data = await res.json();
            if (data.files) setFiles(data.files);
        } catch (err) {
            console.error("Gagal load files", err);
        }
        setLoading(false);
    };

    const loadHistory = () => {
        try {
            const saved = localStorage.getItem('rainflowUploadHistory');
            if (saved) setHistory(JSON.parse(saved));
        } catch (e) { }
    };

    const clearHistory = () => {
        setConfirmAction({
            message: 'Yakin ingin menghapus semua riwayat upload?',
            onConfirm: () => {
                localStorage.removeItem('rainflowUploadHistory');
                setHistory([]);
                showToast('✅ Riwayat berhasil dihapus.');
            }
        });
    };

    const deleteFile = (filename) => {
        setConfirmAction({
            message: `Hapus file "${filename}" dari server?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/file/${encodeURIComponent(filename)}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast(`✅ File "${filename}" dihapus.`);
                        fetchFiles();
                    } else {
                        showToast('Gagal menghapus file.', true);
                    }
                } catch (err) {
                    showToast('Gagal hapus file: ' + err.message, true);
                }
            }
        });
    };

    const clearAllFiles = () => {
        setConfirmAction({
            message: '⚠️ HAPUS SEMUA file hasil dan temporary di server BenAlus? Aksi ini tidak bisa dibatalkan.',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/clear-uploads', { method: 'DELETE' });
                    if (res.ok) {
                        const data = await res.json();
                        showToast(`✅ Berhasil menghapus ${data.deleted} file.`);
                        fetchFiles();
                    } else {
                        showToast('Gagal membersihkan file.', true);
                    }
                } catch (err) {
                    showToast('Error: ' + err.message, true);
                }
            }
        });
    };

    const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="sheet-backdrop" onClick={onClose} style={{ zIndex: 1000 }} />
            <div className="sheet" style={{ zIndex: 1001, height: '85vh' }}>
                <div className="sheet__handle" />
                <div className="sheet__header">
                    <h2 className="sheet__title">🗄️ Storage & Riwayat</h2>
                    <button className="sheet__close" onClick={onClose} id="storage-sheet-close">✕</button>
                </div>

                {/* Internal Toast */}
                {toast && (
                    <div style={{
                        margin: '0 20px 8px',
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

                {/* Confirm Dialog */}
                {confirmAction && (
                    <div style={{
                        margin: '0 20px 12px',
                        padding: '14px 16px',
                        borderRadius: 8,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                    }}>
                        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5 }}>{confirmAction.message}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn--danger btn--sm" onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }}>
                                Ya, hapus
                            </button>
                            <button className="btn btn--outline btn--sm" onClick={() => setConfirmAction(null)}>
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                <div className="sheet__body" style={{ overflowY: 'auto' }}>
                    {/* Upload History */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="card__title" style={{ margin: 0 }}>
                                <span className="card__title-icon">🕒</span>
                                Riwayat Upload ke Drive
                            </h3>
                            {history.length > 0 && (
                                <button className="btn btn--danger btn--sm" onClick={clearHistory}>
                                    Hapus Semua
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
                                            <p className="status-item__name">📹 {h.name}</p>
                                            <p className="status-item__detail">
                                                {new Date(h.date).toLocaleString('id-ID')} •{' '}
                                                <a href={h.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: 4 }}>
                                                    Lihat di Drive ↗
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Files at Server */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="card__title" style={{ margin: 0 }}>
                                <span className="card__title-icon">📂</span>
                                File di Server BenAlus
                            </h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn--outline btn--sm" onClick={fetchFiles}>↻ Refresh</button>
                                {files.length > 0 && (
                                    <button className="btn btn--danger btn--sm" onClick={clearAllFiles}>
                                        🗑️ Bersihkan Semua
                                    </button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat...</p>
                        ) : files.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Penyimpanan kosong. 🎉</p>
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
                                        <button
                                            className="btn btn--sm"
                                            onClick={() => deleteFile(f.name)}
                                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', flexShrink: 0 }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
