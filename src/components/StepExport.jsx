import React, { useState, useCallback } from 'react'

export default function StepExport({ images, settings, outputNames, driveToken, apiUrl, apiKey }) {
    const [uploadStatus, setUploadStatus] = useState({}) // { imgId: 'uploading' | 'done' | 'error' | url }

    const doneVideos = images.filter(img => img.status === 'done')
    const totalImages = images.length

    const formatDuration = (s) => {
        const h = s / 3600
        return Number.isInteger(h) ? `${h} Jam` : `${(s / 60).toFixed(0)} Menit`
    }

    const getStartDate = () => {
        if (settings.startDate) return new Date(settings.startDate)
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
    }

    const startDate = getStartDate()

    // Upload a single video to Google Drive via backend proxy
    const uploadToDrive = useCallback(async (img, outputName) => {
        if (!driveToken || !img.videoUrl) return

        setUploadStatus(prev => ({ ...prev, [img.id]: 'uploading' }))

        try {
            const response = await fetch('/v1/drive/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_url: img.videoUrl,
                    filename: `${outputName}.mp4`,
                    access_token: driveToken,
                }),
            })

            if (!response.ok) {
                const err = await response.text().catch(() => 'Unknown error')
                throw new Error(`Upload gagal: ${err.slice(0, 100)}`)
            }

            const result = await response.json()
            if (result.success) {
                setUploadStatus(prev => ({ ...prev, [img.id]: result.drive_url || 'done' }))
            } else {
                throw new Error(result.error || 'Upload gagal')
            }
        } catch (err) {
            setUploadStatus(prev => ({ ...prev, [img.id]: `error:${err.message}` }))
        }
    }, [driveToken])

    // Upload all done videos to Drive
    const uploadAllToDrive = useCallback(async () => {
        for (const img of doneVideos) {
            const idx = images.findIndex(m => m.id === img.id)
            const name = outputNames[idx] || `video_${idx}`
            await uploadToDrive(img, name)
        }
    }, [doneVideos, images, outputNames, uploadToDrive])

    return (
        <div>
            {/* Summary Stats */}
            <div className="card">
                <h3 className="card__title">
                    <span className="card__title-icon">📦</span>
                    Step 4 — Export & Ringkasan
                </h3>
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-card__value">{totalImages}</div>
                        <div className="stat-card__label">Total Gambar</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">{doneVideos.length}</div>
                        <div className="stat-card__label">Video Ready</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">{formatDuration(settings.loopDuration)}</div>
                        <div className="stat-card__label">Per Video</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value" style={{ fontSize: doneVideos.length > 3 ? 16 : 24 }}>
                            {formatDuration(settings.loopDuration * doneVideos.length)}
                        </div>
                        <div className="stat-card__label">Total Konten</div>
                    </div>
                </div>
            </div>

            {/* Google Drive Upload */}
            {doneVideos.length > 0 && (
                <div className="card">
                    <h3 className="card__title">
                        <span className="card__title-icon">📂</span>
                        Upload ke Google Drive
                    </h3>

                    {driveToken ? (
                        <>
                            <p className="card__desc">
                                Drive terhubung. Klik tombol untuk upload video langsung ke folder Drive Anda.
                            </p>
                            <div className="btn-group" style={{ marginBottom: 16 }}>
                                <button
                                    className="btn btn--primary btn--full"
                                    onClick={uploadAllToDrive}
                                    id="btn-upload-all-drive"
                                >
                                    📂 Upload Semua ke Drive ({doneVideos.length} video)
                                </button>
                            </div>

                            <div className="status-list">
                                {doneVideos.map((img, i) => {
                                    const idx = images.findIndex(m => m.id === img.id)
                                    const name = outputNames[idx] || `video_${i}`
                                    const st = uploadStatus[img.id]
                                    const isUploading = st === 'uploading'
                                    const isDone = st && st !== 'uploading' && !String(st).startsWith('error')
                                    const isError = String(st || '').startsWith('error')

                                    return (
                                        <div className="status-item status-item--done" key={img.id}>
                                            <img className="status-item__thumb" src={img.preview} alt={name} />
                                            <div className="status-item__info">
                                                <p className="status-item__name">{name}.mp4</p>
                                                <p className="status-item__detail">
                                                    {isError && `❌ ${String(st).replace('error:', '')}`}
                                                    {isUploading && '⏳ Mengupload...'}
                                                    {isDone && typeof st === 'string' && st.startsWith('http') ? (
                                                        <a href={st} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                                                            ✅ Lihat di Drive
                                                        </a>
                                                    ) : isDone && '✅ Upload berhasil'}
                                                    {!st && `Siap upload`}
                                                </p>
                                            </div>
                                            {!isDone && (
                                                <button
                                                    className={`btn btn--sm ${isUploading ? 'btn--outline' : 'btn--outline'}`}
                                                    onClick={() => uploadToDrive(img, name)}
                                                    disabled={isUploading}
                                                >
                                                    {isUploading ? <><span className="spinner" style={{ marginRight: 4 }} />...</> : '📤'}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="tip-box">
                            <span className="tip-box__icon">💡</span>
                            <span className="tip-box__text">
                                Hubungkan Google Drive di bagian atas halaman untuk mengaktifkan upload otomatis.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Schedule */}
            <div className="card">
                <h3 className="card__title">
                    <span className="card__title-icon">📅</span>
                    Jadwal Upload YouTube
                </h3>
                <p className="card__desc">
                    Berdasarkan naming output, berikut jadwal upload video Anda:
                </p>

                <table className="summary-table" id="upload-schedule">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nama File</th>
                            <th>Tanggal Upload</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {images.map((img, index) => {
                            const name = outputNames[index] || `video_${index}`
                            const uploadDate = new Date(startDate)
                            uploadDate.setDate(uploadDate.getDate() + index)
                            const isDone = img.status === 'done'
                            const driveUploaded = uploadStatus[img.id] && !String(uploadStatus[img.id]).startsWith('error')

                            return (
                                <tr key={img.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                                    <td className="mono">{name}.mp4</td>
                                    <td>
                                        {uploadDate.toLocaleDateString('id-ID', {
                                            weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
                                        })}
                                    </td>
                                    <td>
                                        <span className={`status-item__badge status-item__badge--${driveUploaded ? 'ready' : isDone ? 'done' : img.status}`}>
                                            {driveUploaded ? '☁️ Drive' : isDone ? '✓ Ready' : img.status}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Checklist */}
            <div className="card">
                <h3 className="card__title">
                    <span className="card__title-icon">✅</span>
                    Checklist Kesiapan Upload
                </h3>
                <div className="status-list">
                    <ChecklistItem done={totalImages > 0} label="Gambar referensi diimpor" detail={`${totalImages} gambar`} />
                    <ChecklistItem done={doneVideos.length === totalImages && totalImages > 0} label="Semua video berhasil di-generate (Step 2)" detail={`${doneVideos.length}/${totalImages} selesai`} />
                    <ChecklistItem
                        done={doneVideos.filter(img => img.videoUrl && img.videoUrl.includes('/downloads/')).length > 0}
                        label="Proses BenAlus Seamless Loop (Step 3)"
                        detail={`${doneVideos.filter(img => img.videoUrl && img.videoUrl.includes('/downloads/')).length}/${totalImages} video siap`}
                    />
                    <ChecklistItem done={Object.values(uploadStatus).filter(s => s && !String(s).startsWith('error')).length > 0} label="Upload ke Google Drive" detail={`${Object.values(uploadStatus).filter(s => s && !String(s).startsWith('error')).length} video terupload`} />
                    <ChecklistItem done={false} label="Upload video sesuai jadwal YouTube" detail="Ikuti tabel jadwal di atas" />
                </div>

                <div className="tip-box tip-box--success" style={{ marginTop: 20 }}>
                    <span className="tip-box__icon">🎉</span>
                    <span className="tip-box__text">
                        <strong>Workflow selesai!</strong> Semua step bisa diulang kapan saja tanpa urutan paksa.
                    </span>
                </div>
            </div>
        </div>
    )
}

function ChecklistItem({ done, label, detail }) {
    return (
        <div className={`status-item ${done ? 'status-item--done' : ''}`}>
            <span style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
                background: done ? 'var(--success-bg)' : 'rgba(100,116,139,0.1)',
                color: done ? 'var(--success)' : 'var(--text-muted)',
                border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`
            }}>
                {done ? '✓' : '○'}
            </span>
            <div className="status-item__info">
                <p className="status-item__name" style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
                    {label}
                </p>
                <p className="status-item__detail">{detail}</p>
            </div>
        </div>
    )
}
