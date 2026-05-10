import React, { useEffect, useMemo, useState } from 'react'
import { Activity, Trash2, RefreshCw, Clock } from 'lucide-react'
import { clearActivityLogs, readActivityLogs } from '../utils/activityLog'

export default function ActivityLogs() {
    const [logs, setLogs] = useState([])

    const refreshLogs = () => {
        setLogs(readActivityLogs())
    }

    useEffect(() => {
        refreshLogs()
        const t = setInterval(refreshLogs, 1500)
        return () => clearInterval(t)
    }, [])

    const grouped = useMemo(() => logs.slice(0, 300), [logs])

    return (
        <div>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <h3 className="card__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={20} className="card__title-icon" style={{ color: 'var(--accent)' }} />
                        Log Aktivitas
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn--outline btn--sm" onClick={refreshLogs} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button
                            className="btn btn--danger btn--sm"
                            onClick={() => { clearActivityLogs(); refreshLogs() }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Trash2 size={14} /> Hapus Log
                        </button>
                    </div>
                </div>
                <p className="card__desc" style={{ marginTop: 10 }}>
                    Riwayat event aplikasi terbaru (import, generate, proses, upload Drive, dan error).
                </p>
            </div>

            <div className="card">
                {grouped.length === 0 ? (
                    <div className="empty-state">
                        <Clock size={36} className="empty-state__icon" style={{ color: 'var(--text-muted)' }} />
                        <p className="empty-state__text">Belum ada aktivitas tercatat.</p>
                    </div>
                ) : (
                    <div className="status-list">
                        {grouped.map((log) => (
                            <div key={log.id} className="status-item">
                                <div className="status-item__info">
                                    <p className="status-item__name">{log.message}</p>
                                    <p className="status-item__detail">
                                        {new Date(log.at).toLocaleString('id-ID')} • {String(log.type || 'event').toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
