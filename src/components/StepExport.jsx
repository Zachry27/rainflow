import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Package, FolderOpen, Calendar, CheckSquare, Cloud, Check, Clock, AlertCircle, Sparkles, X, CheckCircle, UploadCloud } from 'lucide-react'
import { pushActivityLog } from '../utils/activityLog'

export default function StepExport({ images, settings, outputNames, driveToken, apiUrl, apiKey, isActive = true }) {
    const [uploadStatus, setUploadStatus] = useState({}) // { imgId: { state, progress, url, error } }
    const [uploadHistory, setUploadHistory] = useState([])

    const doneVideos = images.filter(img => img.status === 'done')
    const totalImages = images.length

    const loadUploadHistory = useCallback(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('rainflowUploadHistory') || '[]')
            setUploadHistory(Array.isArray(parsed) ? parsed : [])
        } catch (e) {
            setUploadHistory([])
        }
    }, [])

    useEffect(() => {
        if (!isActive) return
        loadUploadHistory()
        const t = setInterval(loadUploadHistory, 2000)
        return () => clearInterval(t)
    }, [isActive, loadUploadHistory])

    const getNameByImage = useCallback((img, fallbackIndex = 0) => {
        const idx = images.findIndex(m => m.id === img.id)
        return outputNames[idx] || `video_${idx >= 0 ? idx : fallbackIndex}`
    }, [images, outputNames])

    const getHistoryUrlForName = useCallback((outputName) => {
        const target = `${outputName}.mp4`
        const found = uploadHistory.find(h => h?.name === target)
        return found?.url || null
    }, [uploadHistory])

    const resolvedUploadStatus = useMemo(() => {
        const map = {}
        doneVideos.forEach((img, i) => {
            const local = uploadStatus[img.id]
            if (local) {
                map[img.id] = local
                return
            }
            const name = getNameByImage(img, i)
            const historyUrl = getHistoryUrlForName(name)
            map[img.id] = historyUrl
                ? { state: 'done', progress: 100, url: historyUrl }
                : { state: 'idle', progress: 0 }
        })
        return map
    }, [doneVideos, uploadStatus, getNameByImage, getHistoryUrlForName])

    const uploadedCount = useMemo(
        () => doneVideos.filter(img => resolvedUploadStatus[img.id]?.state === 'done').length,
        [doneVideos, resolvedUploadStatus]
    )
    const pendingUploadCount = Math.max(0, doneVideos.length - uploadedCount)

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

    const uploadMultipartToDrive = useCallback((formData, onProgress) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink')
            xhr.setRequestHeader('Authorization', `Bearer ${driveToken}`)
            xhr.upload.onprogress = (evt) => {
                if (evt.lengthComputable && typeof onProgress === 'function') {
                    const progress = Math.max(1, Math.min(100, Math.round((evt.loaded / evt.total) * 100)))
                    onProgress(progress)
                }
            }
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText || '{}'))
                    } catch (e) {
                        reject(new Error('Respons Google Drive tidak valid'))
                    }
                    return
                }
                reject(new Error(`Drive upload gagal: HTTP ${xhr.status} ${(xhr.responseText || '').slice(0, 100)}`))
            }
            xhr.onerror = () => reject(new Error('Koneksi upload ke Google Drive gagal'))
            xhr.send(formData)
        })
    }, [driveToken])

    // Upload satu video langsung ke Google Drive API (tanpa backend Python)
    const uploadToDrive = useCallback(async (img, outputName) => {
        if (!driveToken || !img.videoUrl) return

        setUploadStatus(prev => ({ ...prev, [img.id]: { state: 'downloading', progress: 0 } }))
        pushActivityLog('drive', `Mulai upload ${outputName}.mp4`, { imageId: img.id })

        try {
            // 1. Download video dari BenAlus
            const videoRes = await fetch(img.videoUrl)
            if (!videoRes.ok) throw new Error(`Download gagal: HTTP ${videoRes.status}`)
            const videoBlob = await videoRes.blob()

            setUploadStatus(prev => ({ ...prev, [img.id]: { state: 'uploading', progress: 1 } }))

            // 2. Upload langsung ke Google Drive API
            const metadata = { name: `${outputName}.mp4`, mimeType: 'video/mp4' }
            const form = new FormData()
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
            form.append('file', videoBlob)

            const result = await uploadMultipartToDrive(form, (progress) => {
                setUploadStatus(prev => ({ ...prev, [img.id]: { state: 'uploading', progress } }))
            })
            const driveUrl = result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`

            // 3. Simpan ke riwayat
            try {
                const history = JSON.parse(localStorage.getItem('rainflowUploadHistory') || '[]')
                history.unshift({ name: `${outputName}.mp4`, date: new Date().toISOString(), url: driveUrl })
                localStorage.setItem('rainflowUploadHistory', JSON.stringify(history))
                loadUploadHistory()
            } catch (e) {}

            setUploadStatus(prev => ({ ...prev, [img.id]: { state: 'done', progress: 100, url: driveUrl } }))
            pushActivityLog('drive', `Upload berhasil ${outputName}.mp4`, { imageId: img.id, url: driveUrl })
        } catch (err) {
            setUploadStatus(prev => ({ ...prev, [img.id]: { state: 'error', progress: 0, error: err.message } }))
            pushActivityLog('drive', `Upload gagal ${outputName}.mp4: ${err.message}`, { imageId: img.id })
        }
    }, [driveToken, uploadMultipartToDrive, loadUploadHistory])

    // Upload all done videos to Drive
    const uploadAllToDrive = useCallback(async () => {
        const pendingItems = doneVideos.filter(img => resolvedUploadStatus[img.id]?.state !== 'done')
        for (const img of pendingItems) {
            const name = getNameByImage(img)
            await uploadToDrive(img, name)
        }
    }, [doneVideos, resolvedUploadStatus, getNameByImage, uploadToDrive])

    if (!isActive) return null

    return (
        <div>
            {/* Summary Stats */}
            <div className="card">
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={20} className="card__title-icon" style={{ color: 'var(--warning)' }} />
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
                    <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FolderOpen size={20} className="card__title-icon" style={{ color: 'var(--accent)' }} />
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
                                    disabled={pendingUploadCount === 0}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    <UploadCloud size={18} /> {pendingUploadCount === 0
                                        ? 'Semua video sudah terupload'
                                        : `Upload Semua ke Drive (${pendingUploadCount} video sisa)`}
                                </button>
                            </div>

                            {isActive && (
                                <div className="status-list">
                                    {doneVideos.map((img, i) => {
                                        const name = getNameByImage(img, i)
                                        const st = resolvedUploadStatus[img.id] || { state: 'idle', progress: 0 }
                                        const isUploading = st.state === 'uploading' || st.state === 'downloading'
                                        const isDone = st.state === 'done'
                                        const isError = st.state === 'error'

                                        return (
                                            <div className="status-item status-item--done" key={img.id}>
                                                <img className="status-item__thumb" src={img.preview} alt={name} decoding="async" loading="lazy" />
                                            <div className="status-item__info">
                                                <p className="status-item__name">{name}.mp4</p>
                                                <p className="status-item__detail" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {isError && <><X size={12} style={{ color: 'var(--error)' }} /> {st.error || 'Upload gagal'}</>}
                                                    {st.state === 'downloading' && <><Clock size={12} /> Menyiapkan file...</>}
                                                    {st.state === 'uploading' && <><Clock size={12} /> Mengupload... {st.progress || 0}%</>}
                                                    {isDone && st.url ? (
                                                        <a href={st.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <CheckCircle size={12} /> Lihat di Drive
                                                        </a>
                                                    ) : isDone && <><CheckCircle size={12} /> Upload berhasil</>}
                                                    {st.state === 'idle' && 'Siap upload'}
                                                </p>
                                            </div>
                                            {!isDone && (
                                                <button
                                                    className={`btn btn--sm ${isUploading ? 'btn--outline' : 'btn--outline'}`}
                                                    onClick={() => uploadToDrive(img, name)}
                                                    disabled={isUploading}
                                                >
                                                    {isUploading ? <><span className="spinner" style={{ marginRight: 4 }} />{st.progress || 0}%</> : <UploadCloud size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="tip-box">
                            <Sparkles size={18} className="tip-box__icon" />
                            <span className="tip-box__text">
                                Hubungkan Google Drive di bagian atas halaman untuk mengaktifkan upload otomatis.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Schedule */}
            <div className="card">
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={20} className="card__title-icon" style={{ color: '#ec4899' }} />
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
                            const driveUploaded = resolvedUploadStatus[img.id]?.state === 'done'

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
                                        <span className={`status-item__badge status-item__badge--${driveUploaded ? 'ready' : isDone ? 'done' : img.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {driveUploaded ? <><Cloud size={12} /> Drive</> : isDone ? <><Check size={12} /> Ready</> : img.status}
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
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckSquare size={20} className="card__title-icon" style={{ color: 'var(--success)' }} />
                    Checklist Kesiapan Upload
                </h3>
                <div className="status-list">
                    <ChecklistItem done={totalImages > 0} label="Gambar referensi diimpor" detail={`${totalImages} gambar`} />
                    <ChecklistItem done={doneVideos.length === totalImages && totalImages > 0} label="Semua video berhasil di-generate (Step 2)" detail={`${doneVideos.length}/${totalImages} selesai`} />
                    <ChecklistItem
                        done={doneVideos.filter(img => img.videoUrl && img.videoUrl.includes('/downloads/')).length === totalImages && totalImages > 0}
                        label="Proses BenAlus Seamless Loop (Step 3)"
                        detail={`${doneVideos.filter(img => img.videoUrl && img.videoUrl.includes('/downloads/')).length}/${totalImages} video siap`}
                    />
                    <ChecklistItem
                        done={uploadedCount === doneVideos.length && doneVideos.length > 0}
                        label="Upload ke Google Drive"
                        detail={`${uploadedCount}/${doneVideos.length} video terupload`}
                    />
                    <ChecklistItem done={false} label="Upload video sesuai jadwal YouTube" detail="Ikuti tabel jadwal di atas" />
                </div>

                <div className="tip-box tip-box--success" style={{ marginTop: 20 }}>
                    <Sparkles size={18} className="tip-box__icon" />
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
                {done ? <Check size={16} /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />}
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
