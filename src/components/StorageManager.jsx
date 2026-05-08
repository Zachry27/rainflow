import React, { useState, useEffect } from 'react';

export default function StorageManager({ isOpen, onClose }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
            loadHistory();
        }
    }, [isOpen]);

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
        if (confirm('Yakin ingin menghapus semua history?')) {
            localStorage.removeItem('rainflowUploadHistory');
            setHistory([]);
        }
    };

    const deleteFile = async (filename) => {
        if (!confirm(`Hapus file ${filename}?`)) return;
        try {
            const res = await fetch(`/api/file/${encodeURIComponent(filename)}`, { method: 'DELETE' });
            if (res.ok) fetchFiles();
        } catch (err) {
            alert('Gagal hapus file: ' + err.message);
        }
    };

    const clearAllFiles = async () => {
        if (!confirm('AWAS! Yakin ingin menghapus SEMUA file hasil dan temporary di server?')) return;
        try {
            const res = await fetch('/api/clear-uploads', { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                alert(`Berhasil menghapus ${data.deleted} file.`);
                fetchFiles();
            }
        } catch (err) {
            alert('Gagal clear files: ' + err.message);
        }
    };

    const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

    if (!isOpen) return null;

    return (
        <>
            <div className="sheet-backdrop" onClick={onClose} style={{ zIndex: 1000 }} />
            <div className="sheet" style={{ zIndex: 1001, height: '80vh' }}>
                <div className="sheet__handle" />
                <div className="sheet__header">
                    <h2 className="sheet__title">🗄️ Storage & History</h2>
                    <button className="sheet__close" onClick={onClose}>✕</button>
                </div>
                
                <div className="sheet__body" style={{ overflowY: 'auto' }}>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card__title" style={{ margin: 0 }}>
                                <span className="card__title-icon">🕒</span> Upload History
                            </h3>
                            {history.length > 0 && (
                                <button className="btn btn--danger btn--sm" onClick={clearHistory}>
                                    Clear History
                                </button>
                            )}
                        </div>
                        {history.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Belum ada riwayat upload.</p>
                        ) : (
                            <div className="status-list" style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
                                {history.map((h, i) => (
                                    <div key={i} className="status-item status-item--done" style={{ padding: 8 }}>
                                        <div className="status-item__info">
                                            <p className="status-item__name">{h.name}</p>
                                            <p className="status-item__detail">
                                                {new Date(h.date).toLocaleString('id-ID')} • 
                                                <a href={h.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: 4 }}>
                                                    Lihat di Drive
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 className="card__title" style={{ margin: 0 }}>
                                <span className="card__title-icon">📂</span> File di Server
                            </h3>
                            <div>
                                <button className="btn btn--outline btn--sm" onClick={fetchFiles} style={{ marginRight: 8 }}>
                                    ↻ Refresh
                                </button>
                                {files.length > 0 && (
                                    <button className="btn btn--danger btn--sm" onClick={clearAllFiles}>
                                        🗑️ Bersihkan Semua
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {loading ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
                        ) : files.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Penyimpanan kosong.</p>
                        ) : (
                            <div className="status-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {files.map((f, i) => (
                                    <div key={i} className="status-item" style={{ padding: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div className="status-item__info" style={{ flex: 1, overflow: 'hidden' }}>
                                            <p className="status-item__name" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={f.name}>
                                                {f.name}
                                            </p>
                                            <p className="status-item__detail">
                                                {formatSize(f.size)} • {new Date(f.createdAt).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <button className="btn btn--sm btn--outline" onClick={() => deleteFile(f.name)} style={{ marginLeft: 8, color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                            ✕
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
