import React, { useState, useCallback, useRef } from 'react'

const API_BASE = '/v1'

export default function StepProcess({ images, settings, onUpdateSettings, outputNames, onComplete, manualVideos, onManualVideosChange, driveAccessToken }) {
    // ── State ──
    const [copiedId, setCopiedId] = useState(null)
    const [manualInput, setManualInput] = useState('')
    const [activeTab, setActiveTab] = useState('script') // 'script' | 'vps'

    // VPS Runner state
    const [jobId] = useState(() => `job_${Date.now().toString(36)}`)
    const [uploadedFiles, setUploadedFiles] = useState([]) // filenames uploaded to VPS
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState({}) // filename -> %
    const [job, setJob] = useState(null) // job status object
    const [polling, setPolling] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null) // URL for video preview
    const [gdriveVideoLoading, setGdriveVideoLoading] = useState(false)
    const pollRef = useRef(null)
    const videoInputRef = useRef(null)
    const audioInputRef = useRef(null)

    const doneVideos = images.filter(img => img.status === 'done')
    const isBenalus = settings.processMode === 'benalus'

    const allVideoNames = [
        ...doneVideos.map((img, i) => {
            const idx = images.findIndex(m => m.id === img.id)
            return outputNames[idx] || `video_${i}`
        }),
        ...manualVideos
    ]

    // ── Script Mode Helpers ──
    const handleCopy = useCallback((id, text) => {
        navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.cssText = 'position:fixed;opacity:0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
        }).finally(() => {
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
        })
    }, [])

    const handleAddManual = () => {
        const name = manualInput.trim().replace(/\.mp4$/i, '').replace(/_raw$/i, '')
        if (name && !allVideoNames.includes(name)) {
            onManualVideosChange([...manualVideos, name])
            setManualInput('')
        }
    }

    const handleRemoveManual = (name) => {
        onManualVideosChange(manualVideos.filter(v => v !== name))
    }

    const formatDuration = (s) => {
        const h = s / 3600
        return Number.isInteger(h) ? `${h} Jam` : `${(s / 60).toFixed(0)} Menit`
    }

    // ── FFmpeg Script Builders ──
    const getStandardCommand = (name) =>
        `#!/bin/bash
# ================================================
# 🌊 RAINFLOW — ${name}
# ================================================
INPUT="${name}_raw.mp4"
AUDIO="${settings.audioFile}"
OUTPUT="${name}.mp4"
DURATION=${settings.loopDuration}
CRF=${settings.crf}

echo "🎬 [1/2] Encoding..."
ffmpeg -i "$INPUT" \\
  -c:v libx264 -preset slow -crf $CRF \\
  -x264opts "keyint=1:min-keyint=1" \\
  -pix_fmt yuv420p -an \\
  ${name}_ready.mp4

echo "🔁 [2/2] Looping + audio..."
ffmpeg -stream_loop -1 -i ${name}_ready.mp4 \\
  -i "$AUDIO" \\
  -t $DURATION \\
  -c:v copy -c:a aac -b:a 320k \\
  -map 0:v:0 -map 1:a:0 -shortest \\
  "$OUTPUT"

rm -f ${name}_ready.mp4
echo "✅ selesai: $OUTPUT"`

    const getBenalusCommand = (name) => {
        const fd = settings.fadeDuration || 0.8
        const vd = settings.videoDuration || 6
        return `#!/bin/bash
# ================================================
# 🔄 BENALUS SEAMLESS — ${name}
# 4-Step: Deflicker → Fade → Loop → Audio
# ================================================
INPUT="${name}_raw.mp4"
AUDIO="${settings.benAudio || settings.audioFile}"
OUTPUT="${name}.mp4"
DURATION=${settings.loopDuration}
FADE=${fd}
VD=${vd}

echo "🔧 [1/4] Deflicker..."
ffmpeg -y -i "$INPUT" \\
  -vf 'deflicker=mode=pm:size=10' \\
  -c:v libx264 -preset fast -crf 18 -an \\
  /tmp/${name}_defl.mp4

echo "🌅 [2/4] Alpha fade..."
ffmpeg -y -i /tmp/${name}_defl.mp4 \\
  -vf "fade=t=in:st=0:d=$FADE,fade=t=out:st=$(echo "$VD - $FADE" | bc):d=$FADE" \\
  -c:v libx264 -preset fast -crf 18 -an \\
  /tmp/${name}_fade.mp4

echo "🔁 [3/4] Seamless loop..."
N=$(python3 -c "import math; print(math.ceil($DURATION / $VD))")
printf 'file /tmp/${name}_fade.mp4\\n%.0s' $(seq 1 $N) > /tmp/list_${name}.txt
ffmpeg -y -f concat -safe 0 -i /tmp/list_${name}.txt -c copy /tmp/${name}_loop.mp4

echo "🎵 [4/4] Merge audio..."
ffmpeg -y -i /tmp/${name}_loop.mp4 -i "$AUDIO" \\
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest \\
  "$OUTPUT"

rm -f /tmp/${name}_defl.mp4 /tmp/${name}_fade.mp4 /tmp/${name}_loop.mp4 /tmp/list_${name}.txt
echo "✅ Selesai: $OUTPUT"`
    }

    const getAllBenalusScript = () => {
        const header = `#!/bin/bash
# ================================================
# 🔄 RAINFLOW BenAlus BATCH — ${allVideoNames.length} video
# Mode: BenAlus Seamless Loop (4-step)
# ================================================
set -e
`
        const parts = allVideoNames.map(name => {
            const fd = settings.fadeDuration || 0.8
            const vd = settings.videoDuration || 6
            return `
# === ${name} ===
echo "Processing: ${name}..."
INPUT="${name}_raw.mp4"
ffmpeg -y -i "$INPUT" -vf 'deflicker=mode=pm:size=10' -c:v libx264 -preset fast -crf 18 -an /tmp/${name}_defl.mp4
ffmpeg -y -i /tmp/${name}_defl.mp4 -vf "fade=t=in:st=0:d=${fd},fade=t=out:st=${vd - fd}:d=${fd}" -c:v libx264 -preset fast -crf 18 -an /tmp/${name}_fade.mp4
N=$(python3 -c "import math; print(math.ceil(${settings.loopDuration} / ${vd}))")
printf 'file /tmp/${name}_fade.mp4\\n%.0s' $(seq 1 $N) > /tmp/list_${name}.txt
ffmpeg -y -f concat -safe 0 -i /tmp/list_${name}.txt -c copy /tmp/${name}_loop.mp4
ffmpeg -y -i /tmp/${name}_loop.mp4 -i "${settings.benAudio || settings.audioFile}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest "${name}.mp4"
rm -f /tmp/${name}_*.mp4 /tmp/list_${name}.txt
echo "✅ ${name}.mp4 selesai!"`
        })
        return header + parts.join('\n') + '\n\necho "🎉 SEMUA SELESAI!"'
    }

    const downloadScript = () => {
        const content = isBenalus ? getAllBenalusScript() : allVideoNames.map(n => getStandardCommand(n)).join('\n\n')
        const blob = new Blob([content], { type: 'text/plain' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `rainflow_${isBenalus ? 'benalus' : 'standard'}_batch.sh`
        a.click()
    }

    // ── VPS Runner ──
    const uploadFile = async (file, label) => {
        const fd = new FormData()
        fd.append('job_id', jobId)
        fd.append('file', file)
        setUploadProgress(p => ({ ...p, [label]: 0 }))
        const xhr = new XMLHttpRequest()
        return new Promise((resolve, reject) => {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    setUploadProgress(p => ({ ...p, [label]: Math.round(e.loaded / e.total * 100) }))
                }
            }
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText)
                    setUploadedFiles(f => [...f.filter(x => x !== data.filename), data.filename])
                    resolve(data.filename)
                } else reject(new Error(xhr.responseText))
            }
            xhr.onerror = () => reject(new Error('Upload gagal'))
            xhr.open('POST', `${API_BASE}/ffmpeg/upload`)
            xhr.send(fd)
        })
    }

    const handleLocalUpload = async (files, type) => {
        setUploading(true)
        try {
            await Promise.all(Array.from(files).map(f => uploadFile(f, f.name)))
        } catch (err) {
            alert('Upload gagal: ' + err.message)
        } finally {
            setUploading(false)
        }
    }

    // Import video raw dari Google Drive
    const loadPickerApi = () => new Promise((resolve) => {
        if (window.google?.picker) { resolve(); return }
        if (window.gapi?.load) { window.gapi.load('picker', resolve); return }
        const s = document.createElement('script')
        s.src = 'https://apis.google.com/js/api.js'
        s.onload = () => window.gapi.load('picker', resolve)
        document.head.appendChild(s)
    })

    const importVideoFromDrive = useCallback(async () => {
        if (!driveAccessToken) {
            alert('Sambungkan Google Drive dulu dari header')
            return
        }
        setGdriveVideoLoading(true)
        try {
            await loadPickerApi()
            const picker = new window.google.picker.PickerBuilder()
                .addView(new window.google.picker.DocsView()
                    .setMimeTypes('video/mp4,video/quicktime,video/x-matroska,video/*'))
                .addView(new window.google.picker.DocsView()
                    .setMimeTypes('audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/*'))
                .setOAuthToken(driveAccessToken)
                .setCallback(async (data) => {
                    if (data.action !== 'picked') { setGdriveVideoLoading(false); return }
                    const docs = data.docs || []
                    for (const doc of docs) {
                        const resp = await fetch(
                            `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                            { headers: { Authorization: `Bearer ${driveAccessToken}` } }
                        )
                        const blob = await resp.blob()
                        const file = new File([blob], doc.name, { type: blob.type })
                        await uploadFile(file, doc.name)
                    }
                    setGdriveVideoLoading(false)
                })
                .build()
            picker.setVisible(true)
        } catch (err) {
            alert('GDrive picker error: ' + err.message)
            setGdriveVideoLoading(false)
        }
    }, [driveAccessToken, jobId])

    const startJob = async () => {
        const rawVideoFiles = uploadedFiles.filter(f => f.match(/\.mp4$/i))
        // Video name = filename without extension
        const videoNames = rawVideoFiles.map(f => f.replace(/\.mp4$/i, ''))

        if (videoNames.length === 0) {
            alert('Upload minimal 1 file video .mp4 dulu!')
            return
        }

        const audioFile = uploadedFiles.find(f => f.match(/\.(mp3|aac|wav|ogg)$/i))

        const resp = await fetch(`${API_BASE}/ffmpeg/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videos: videoNames,
                input_files: rawVideoFiles,
                mode: isBenalus ? 'benalus' : 'standard',
                loop_duration: settings.loopDuration,
                video_duration: settings.videoDuration || settings.benVideoLen || 6,
                fade_duration: settings.fadeDuration || settings.benFade || 0.8,
                deflicker: settings.deflicker !== false,
                audio_file: audioFile || null,
                job_dir: jobId,
            })
        })

        if (!resp.ok) {
            const err = await resp.json()
            alert('Error: ' + (err.detail || 'Gagal memulai job'))
            return
        }

        const data = await resp.json()
        setJob(data)
        startPolling(data.job_id)
    }

    const startPolling = (jid) => {
        setPolling(true)
        pollRef.current = setInterval(async () => {
            try {
                const r = await fetch(`${API_BASE}/ffmpeg/jobs/${jid}`)
                const d = await r.json()
                setJob(d)
                if (d.status === 'done' || d.status === 'error') {
                    clearInterval(pollRef.current)
                    setPolling(false)
                }
            } catch { /* ignore */ }
        }, 2000)
    }

    const downloadResult = (filename) => {
        window.open(`${API_BASE}/ffmpeg/jobs/${job.job_id}/download/${filename}`, '_blank')
    }

    // ── UI Helpers ──
    const rawVideos = uploadedFiles.filter(f => f.match(/\.mp4$/i))
    const audioFiles = uploadedFiles.filter(f => f.match(/\.(mp3|aac|wav|ogg)$/i))
    const outputVideos = job?.status === 'done' ? (job.output_files || []) : []

    return (
        <div>
            {/* ── Quick Import (script mode) ── */}
            <div className="card">
                <h3 className="card__title">
                    <span className="card__title-icon">⚡</span>
                    Quick Import — Nama Video
                </h3>
                <p className="card__desc">
                    Tambah nama video mentah secara manual (tanpa extension <code>_raw.mp4</code>).
                    Digunakan jika video sudah ada di server atau belum di-generate via Step 2.
                </p>
                <div className="quick-import">
                    <input
                        className="settings-field__input"
                        type="text"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                        placeholder="contoh: rain_sunset (tanpa _raw.mp4)"
                        id="input-manual-video"
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn--primary btn--sm" onClick={handleAddManual} id="btn-add-manual">
                        + Add
                    </button>
                </div>
                {manualVideos.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {manualVideos.map(v => (
                            <span key={v} style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                borderRadius: 4, padding: '3px 8px', fontSize: 12
                            }}>
                                🎬 {v}
                                <button onClick={() => handleRemoveManual(v)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--danger)', fontSize: 14, padding: 0, lineHeight: 1
                                }}>×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Mode Selector ── */}
            <div className="card">
                <div className="mode-selector">
                    <button
                        className={`mode-btn ${!isBenalus ? 'mode-btn--active' : ''}`}
                        onClick={() => onUpdateSettings('processMode', 'standard')}
                        id="btn-mode-standard"
                    >
                        ⚙️ Standard Loop
                        <span className="mode-btn__badge">2-step</span>
                    </button>
                    <button
                        className={`mode-btn ${isBenalus ? 'mode-btn--active mode-btn--benalus' : ''}`}
                        onClick={() => onUpdateSettings('processMode', 'benalus')}
                        id="btn-mode-benalus"
                    >
                        🔄 BenAlus Seamless
                        <span className="mode-btn__badge mode-btn__badge--special">4-step</span>
                    </button>
                </div>
            </div>

            {/* ── Tab Selector ── */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('script')}
                        style={{
                            flex: 1, padding: '14px', background: 'none', border: 'none',
                            cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            color: activeTab === 'script' ? 'var(--accent)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'script' ? '2px solid var(--accent)' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                        id="tab-script"
                    >
                        💾 Batch Script
                    </button>
                    <button
                        onClick={() => setActiveTab('vps')}
                        style={{
                            flex: 1, padding: '14px', background: 'none', border: 'none',
                            cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            color: activeTab === 'vps' ? 'var(--accent)' : 'var(--text-secondary)',
                            borderBottom: activeTab === 'vps' ? '2px solid var(--accent)' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                        id="tab-vps"
                    >
                        ☁️ Run di VPS
                    </button>
                </div>

                {/* ── SCRIPT TAB ── */}
                {activeTab === 'script' && (
                    <div style={{ padding: 20 }}>
                        {allVideoNames.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                                <p>Belum ada video. Generate di Step 2 atau tambah Quick Import di atas.</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                                        {isBenalus ? '🔄' : '⚙️'} {allVideoNames.length} video · {isBenalus ? 'BenAlus 4-step' : 'Standard 2-step'} · {formatDuration(settings.loopDuration)}
                                    </span>
                                    <button
                                        className="btn btn--primary"
                                        onClick={downloadScript}
                                        id="btn-download-script"
                                    >
                                        💾 Download Batch Script
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {allVideoNames.map((name, idx) => {
                                        const cmd = isBenalus ? getBenalusCommand(name) : getStandardCommand(name)
                                        return (
                                            <div key={name} style={{
                                                background: 'var(--bg-surface)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 8, overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', padding: '8px 12px',
                                                    borderBottom: '1px solid var(--border)'
                                                }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                                                        {isBenalus ? '🔄' : '⚙️'} {name}.mp4
                                                    </span>
                                                    <button
                                                        className="btn btn--sm"
                                                        onClick={() => handleCopy(`cmd_${idx}`, cmd)}
                                                        style={{ fontSize: 11 }}
                                                    >
                                                        {copiedId === `cmd_${idx}` ? '✓ Copied!' : '📋 Copy'}
                                                    </button>
                                                </div>
                                                <pre style={{
                                                    margin: 0, padding: '12px', fontSize: 10.5,
                                                    color: 'var(--text-secondary)', overflow: 'auto',
                                                    maxHeight: 200, fontFamily: 'var(--font-mono)'
                                                }}>
                                                    {cmd.substring(0, 400)}{cmd.length > 400 ? '\n...' : ''}
                                                </pre>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── VPS TAB ── */}
                {activeTab === 'vps' && (
                    <div style={{ padding: 20 }}>
                        {/* Upload Panel */}
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                                📤 Upload File ke VPS
                            </p>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                {/* Upload Local Raw Video */}
                                <button
                                    className="btn btn--secondary btn--sm"
                                    onClick={() => videoInputRef.current?.click()}
                                    disabled={uploading}
                                    id="btn-upload-raw"
                                >
                                    📹 Upload _raw.mp4
                                </button>
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={e => handleLocalUpload(e.target.files, 'video')}
                                />

                                {/* Upload Audio */}
                                <button
                                    className="btn btn--secondary btn--sm"
                                    onClick={() => audioInputRef.current?.click()}
                                    disabled={uploading}
                                    id="btn-upload-audio"
                                >
                                    🎵 Upload Audio
                                </button>
                                <input
                                    ref={audioInputRef}
                                    type="file"
                                    accept="audio/*"
                                    style={{ display: 'none' }}
                                    onChange={e => handleLocalUpload(e.target.files, 'audio')}
                                />

                                {/* Import dari GDrive */}
                                <button
                                    className="btn btn--secondary btn--sm"
                                    onClick={importVideoFromDrive}
                                    disabled={gdriveVideoLoading || uploading}
                                    id="btn-gdrive-video"
                                >
                                    {gdriveVideoLoading ? '⏳ Importing...' : '📂 Import dari Google Drive'}
                                </button>
                            </div>

                            {/* Upload Progress */}
                            {Object.entries(uploadProgress).map(([name, pct]) => (
                                <div key={name} style={{ marginBottom: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                                        <div style={{
                                            height: '100%', background: 'var(--accent)',
                                            borderRadius: 2, width: `${pct}%`, transition: 'width 0.3s'
                                        }} />
                                    </div>
                                </div>
                            ))}

                            {/* Uploaded file list */}
                            {uploadedFiles.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>File di VPS:</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {uploadedFiles.map(f => (
                                            <span key={f} style={{
                                                fontSize: 11, padding: '2px 8px',
                                                background: f.endsWith('_raw.mp4') ? 'rgba(99,102,241,0.15)' :
                                                    f.match(/\.(mp3|aac|wav)$/i) ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 4, color: 'var(--text-primary)'
                                            }}>
                                                {f.match(/\.(mp3|aac|wav)$/i) ? '🎵' : '📹'} {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Proses Button */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <button
                                className={`btn btn--primary ${job?.status === 'running' ? 'btn--loading' : ''}`}
                                onClick={startJob}
                                disabled={rawVideos.length === 0 || job?.status === 'running' || polling}
                                id="btn-vps-process"
                                style={{ minWidth: 200, fontSize: 15 }}
                            >
                                {job?.status === 'running' ? '⏳ Memproses...' :
                                    job?.status === 'done' ? '✅ Selesai!' :
                                        '▶ Proses Sekarang di VPS'}
                            </button>
                        </div>

                        {/* Progress Bar */}
                        {job && (
                            <div style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 8, padding: 16, marginBottom: 16
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{job.message}</span>
                                    <span style={{
                                        fontSize: 12, fontWeight: 700,
                                        color: job.status === 'done' ? 'var(--success)' :
                                            job.status === 'error' ? 'var(--danger)' : 'var(--accent)'
                                    }}>
                                        {job.progress}%
                                    </span>
                                </div>
                                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 4,
                                        background: job.status === 'error' ? 'var(--danger)' :
                                            job.status === 'done' ? 'var(--success)' : 'var(--accent)',
                                        width: `${job.progress}%`,
                                        transition: 'width 0.5s ease',
                                        backgroundImage: job.status === 'running' ?
                                            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' : 'none',
                                        animation: job.status === 'running' ? 'shimmer 1.5s infinite' : 'none'
                                    }} />
                                </div>
                                {job.status === 'error' && (
                                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{job.error}</p>
                                )}

                                {/* Download Results */}
                                {job.status === 'done' && outputVideos.length > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>⬇️ Download Hasil:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {outputVideos.map(f => (
                                                <button
                                                    key={f}
                                                    className="btn btn--success btn--sm"
                                                    onClick={() => downloadResult(f)}
                                                    id={`btn-download-${f}`}
                                                >
                                                    ⬇️ {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Video Preview */}
                        {previewUrl && (
                            <div style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 8, overflow: 'hidden', marginBottom: 16
                            }}>
                                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700 }}>
                                    🎬 Video Preview
                                    <button onClick={() => setPreviewUrl(null)} style={{
                                        float: 'right', background: 'none', border: 'none',
                                        cursor: 'pointer', color: 'var(--text-secondary)'
                                    }}>✕</button>
                                </div>
                                <video
                                    src={previewUrl}
                                    controls
                                    style={{ width: '100%', maxHeight: 280, background: '#000' }}
                                />
                            </div>
                        )}

                        {/* Preview Buttons untuk Raw Videos */}
                        {rawVideos.length > 0 && (
                            <div>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    🎬 Preview Video Raw:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {rawVideos.map(f => (
                                        <button
                                            key={f}
                                            className="btn btn--secondary btn--sm"
                                            onClick={() => setPreviewUrl(`${API_BASE}/ffmpeg/jobs/${jobId}/download/${f}`)}
                                            id={`btn-preview-${f}`}
                                        >
                                            ▶ {f.replace('_raw.mp4', '')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="tip-box" style={{ marginTop: 16 }}>
                <span className="tip-box__icon">{isBenalus ? '🔄' : '⚙️'}</span>
                <span className="tip-box__text">
                    {isBenalus
                        ? <><strong>BenAlus 4-step:</strong> Deflicker → Alpha Fade → Seamless Loop → Merge Audio. Hasil seamless 100%, cocok untuk long-play YouTube.</>
                        : <><strong>Standard 2-step:</strong> Encode untuk keyint=1 → Loop + merge audio. Proses lebih cepat, hasil loop mulus.</>
                    }
                    {' '}Tab <strong>☁️ Run di VPS</strong> memproses langsung di server, <strong>💾 Batch Script</strong> untuk download & jalankan manual.
                </span>
            </div>
        </div>
    )
}
