import React, { useState, useCallback } from 'react'

export default function StepProcess({ images, settings, onUpdateSettings, outputNames, onComplete, manualVideos, onManualVideosChange }) {
    const [copiedId, setCopiedId] = useState(null)
    const [manualInput, setManualInput] = useState('')

    const doneVideos = images.filter(img => img.status === 'done')
    const isBenalus = settings.processMode === 'benalus'

    // Combined video list: from Generate + manual entries
    const allVideoNames = [
        ...doneVideos.map((img, i) => {
            const idx = images.findIndex(m => m.id === img.id)
            return outputNames[idx] || `video_${i}`
        }),
        ...manualVideos
    ]

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

    // ── STANDARD MODE: 2-step script ──
    const getStandardCommand = (name) =>
        `#!/bin/bash
# ==============================================
# 🌊 RAINFLOW — ${name}
# ==============================================
INPUT="${name}_raw.mp4"
AUDIO="${settings.audioFile}"
OUTPUT="${name}.mp4"
DURATION=${settings.loopDuration}
CRF=${settings.crf}

# Step 1 — Encode untuk seamless loop (keyint=1 wajib)
echo "🎬 [1/2] Encoding..."
ffmpeg -i "$INPUT" \\
  -c:v libx264 -preset slow -crf $CRF \\
  -x264opts "keyint=1:min-keyint=1" \\
  -pix_fmt yuv420p -an \\
  ${name}_ready.mp4

# Step 2 — Loop + merge audio sekaligus
echo "🔁 [2/2] Looping + audio..."
ffmpeg -stream_loop -1 -i ${name}_ready.mp4 \\
  -i "$AUDIO" \\
  -t $DURATION \\
  -c:v copy -c:a aac -b:a 320k \\
  -map 0:v:0 -map 1:a:0 -shortest \\
  "$OUTPUT"

rm -f ${name}_ready.mp4
echo "✅ Selesai: $OUTPUT"
ls -lh "$OUTPUT"`

    // ── BENALUS MODE: 4-step script ──
    const getBenalusCommand = (name) => {
        const fade = settings.fadeDuration
        const vidDur = settings.videoDuration
        const reps = Math.ceil(settings.loopDuration / vidDur) + 2
        const deflicker = settings.enableDeflicker
        const stab = settings.enableStabilization

        let stepA = ''
        if (stab) {
            stepA = `
# Step A — Stabilization + ${deflicker ? 'Deflicker' : ''}
echo "🔧 [A] Stabilization..."
ffmpeg -y -i "$INPUT" \\
  -vf "vidstabdetect=shakiness=5:accuracy=15:result=transforms.trf" \\
  -f null -
ffmpeg -y -i "$INPUT" \\
  -vf "vidstabtransform=input=transforms.trf:zoom=1:smoothing=30${deflicker ? ',deflicker=mode=pm:size=10' : ''}" \\
  -an -c:v libx264 -crf $CRF -preset fast \\
  ${name}_defl.mp4`
        } else if (deflicker) {
            stepA = `
# Step A — Deflicker
echo "💡 [A] Deflicker..."
ffmpeg -y -i "$INPUT" \\
  -vf "deflicker=mode=pm:size=10" \\
  -an -c:v libx264 -crf $CRF -preset fast \\
  ${name}_defl.mp4`
        } else {
            stepA = `
# Step A — Copy (no preprocessing)
cp "$INPUT" ${name}_defl.mp4`
        }

        return `#!/bin/bash
# ==============================================
# 🔄 BENALUSFLOW — ${name}
# Mode: Alpha Fade${deflicker ? ' + Deflicker' : ''}${stab ? ' + Stabilization' : ''}
# ==============================================
INPUT="${name}_raw.mp4"
AUDIO="${settings.audioFile}"
OUTPUT="${name}.mp4"
DURATION=${settings.loopDuration}
CRF=${settings.crf}
FADE=${fade}
VIDEO_DUR=${vidDur}
REPS=${reps}

echo "🎬 BenAlus Pipeline: ${name}"
${stepA}

# Step B — Alpha Fade Seamless Unit (audio off)
echo "🌊 [B] Alpha Fade..."
FADE_START=$(python3 -c "print($VIDEO_DUR - $FADE)")
ffmpeg -y -i ${name}_defl.mp4 \\
  -vf "fade=t=in:st=0:d=$FADE,fade=t=out:st=$FADE_START:d=$FADE" \\
  -an -c:v libx264 -crf $CRF -preset fast \\
  ${name}_fade.mp4

# Step C — Concat & Trim
echo "🔁 [C] Concat $REPS x → trim ke ${settings.loopDuration}s..."
python3 -c "
with open('${name}_list.txt','w') as f:
    [f.write(\"file '${name}_fade.mp4'\\n\") for _ in range($REPS)]
"
ffmpeg -y -f concat -safe 0 -i ${name}_list.txt \\
  -t $DURATION -c copy \\
  ${name}_loop.mp4

# Step D — Merge Audio
echo "🔊 [D] Merge audio..."
ffmpeg -y -i ${name}_loop.mp4 \\
  -i "$AUDIO" \\
  -c:v copy -c:a aac -b:a 320k \\
  -map 0:v:0 -map 1:a:0 -shortest \\
  "$OUTPUT"

# Cleanup
rm -f ${name}_defl.mp4 ${name}_fade.mp4 ${name}_list.txt ${name}_loop.mp4 transforms.trf
echo "✅ Selesai: $OUTPUT"
ls -lh "$OUTPUT"`
    }

    const getCommand = isBenalus ? getBenalusCommand : getStandardCommand

    // ── BATCH SCRIPT ──
    const getBatchScript = () => {
        if (allVideoNames.length === 0) return ''
        const modeLabel = isBenalus ? 'BenAlus Seamless' : 'Standard 2-step'
        const header = `#!/bin/bash
# ==============================================
# 🌊 RAINFLOW — Batch Processing (${modeLabel})
# Total  : ${allVideoNames.length} video
# Durasi : ${formatDuration(settings.loopDuration)} each
# Tanggal: ${new Date().toLocaleDateString('id-ID')}
# ==============================================

AUDIO="${settings.audioFile}"
DURATION=${settings.loopDuration}
CRF=${settings.crf}
${isBenalus ? `FADE=${settings.fadeDuration}
VIDEO_DUR=${settings.videoDuration}
REPS=${Math.ceil(settings.loopDuration / settings.videoDuration) + 2}` : ''}

echo "🌊 Starting ${allVideoNames.length} videos (${modeLabel})..."
echo ""
`
        const body = allVideoNames.map((name, i) => {
            if (isBenalus) {
                const deflicker = settings.enableDeflicker
                const stab = settings.enableStabilization
                let preprocess = ''
                if (stab) {
                    preprocess = `ffmpeg -y -i "${name}_raw.mp4" \\
  -vf "vidstabdetect=shakiness=5:accuracy=15:result=transforms.trf" \\
  -f null - && \\
ffmpeg -y -i "${name}_raw.mp4" \\
  -vf "vidstabtransform=input=transforms.trf:zoom=1:smoothing=30${deflicker ? ',deflicker=mode=pm:size=10' : ''}" \\
  -an -c:v libx264 -crf $CRF -preset fast \\
  ${name}_defl.mp4`
                } else if (deflicker) {
                    preprocess = `ffmpeg -y -i "${name}_raw.mp4" \\
  -vf "deflicker=mode=pm:size=10" \\
  -an -c:v libx264 -crf $CRF -preset fast \\
  ${name}_defl.mp4`
                } else {
                    preprocess = `cp "${name}_raw.mp4" ${name}_defl.mp4`
                }

                return `
# ── [${i + 1}/${allVideoNames.length}] ${name} ──
echo "🎬 Processing ${name}..."
${preprocess} && \\
FADE_START=$(python3 -c "print($VIDEO_DUR - $FADE)") && \\
ffmpeg -y -i ${name}_defl.mp4 \\
  -vf "fade=t=in:st=0:d=$FADE,fade=t=out:st=$FADE_START:d=$FADE" \\
  -an -c:v libx264 -crf $CRF -preset fast \\
  ${name}_fade.mp4 && \\
python3 -c "
with open('${name}_list.txt','w') as f:
    [f.write(\\"file '${name}_fade.mp4'\\n\\") for _ in range($REPS)]
" && \\
ffmpeg -y -f concat -safe 0 -i ${name}_list.txt \\
  -t $DURATION -c copy \\
  ${name}_loop.mp4 && \\
ffmpeg -y -i ${name}_loop.mp4 \\
  -i "$AUDIO" \\
  -c:v copy -c:a aac -b:a 320k \\
  -map 0:v:0 -map 1:a:0 -shortest \\
  "${name}.mp4"
rm -f ${name}_defl.mp4 ${name}_fade.mp4 ${name}_list.txt ${name}_loop.mp4 transforms.trf
echo "  ✅ ${name}.mp4 selesai"
echo ""`
            } else {
                return `
# ── [${i + 1}/${allVideoNames.length}] ${name} ──
echo "🎬 Processing ${name}..."
ffmpeg -i "${name}_raw.mp4" \\
  -c:v libx264 -preset slow -crf $CRF \\
  -x264opts "keyint=1:min-keyint=1" \\
  -pix_fmt yuv420p -an \\
  ${name}_ready.mp4 && \\
ffmpeg -stream_loop -1 -i ${name}_ready.mp4 \\
  -i "$AUDIO" -t $DURATION \\
  -c:v copy -c:a aac -b:a 320k \\
  -map 0:v:0 -map 1:a:0 -shortest \\
  "${name}.mp4"
rm -f ${name}_ready.mp4
echo "  ✅ ${name}.mp4 selesai"
echo ""`
            }
        }).join('')

        return header + body + `\necho "🎉 SEMUA SELESAI! ${allVideoNames.length} video siap."\nls -lh *.mp4\n`
    }

    const batchScript = getBatchScript()

    return (
        <div>
            {/* Quick Import */}
            <div className="card">
                <h3 className="card__title">
                    <span className="card__title-icon">📥</span>
                    Quick Import — Tambah Video Manual
                </h3>
                <p className="card__desc">
                    Tambahkan nama video tanpa perlu lewati Step 1-2. Ketik nama file (tanpa <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>_raw.mp4</code>).
                </p>
                <div className="quick-import">
                    <input
                        className="quick-import__input"
                        type="text"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                        placeholder="cth: vid01, rain_sunset, dll"
                        id="input-manual-video"
                    />
                    <button
                        className="btn btn--primary quick-import__btn"
                        onClick={handleAddManual}
                        disabled={!manualInput.trim()}
                        id="btn-add-manual"
                    >
                        + Add
                    </button>
                </div>

                {manualVideos.length > 0 && (
                    <div className="quick-import__tags">
                        {manualVideos.map(name => (
                            <span key={name} className="quick-import__tag">
                                {name}
                                <button className="quick-import__tag-remove" onClick={() => handleRemoveManual(name)}>×</button>
                            </span>
                        ))}
                    </div>
                )}

                {doneVideos.length > 0 && (
                    <div className="tip-box" style={{ marginTop: 12 }}>
                        <span className="tip-box__icon">✨</span>
                        <span className="tip-box__text">
                            <strong>{doneVideos.length} video</strong> dari Step Generate juga termasuk dalam batch script.
                        </span>
                    </div>
                )}
            </div>

            {allVideoNames.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <span className="empty-state__icon">🔁</span>
                        <p className="empty-state__text">
                            Belum ada video. Gunakan <strong>Quick Import</strong> di atas untuk menambah nama video,
                            atau kembali ke Step 1-2 untuk generate dari gambar.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Main Script Card */}
                    <div className="card">
                        <h3 className="card__title">
                            <span className="card__title-icon">{isBenalus ? '🔄' : '🔁'}</span>
                            Step 3 — {isBenalus ? 'BenAlus Seamless Loop' : 'FFmpeg Process (2-step)'}
                            {isBenalus && <span className="badge-benalus">BENALUS</span>}
                        </h3>

                        {/* Mode selector */}
                        <div className="process-mode-selector">
                            <button
                                className={`process-mode-btn ${!isBenalus ? 'process-mode-btn--active' : ''}`}
                                onClick={() => onUpdateSettings('processMode', 'standard')}
                                id="btn-mode-standard"
                            >
                                🔁 Standard
                                <span className="process-mode-btn__sub">2-step • keyint loop</span>
                            </button>
                            <button
                                className={`process-mode-btn ${isBenalus ? 'process-mode-btn--active process-mode-btn--benalus' : ''}`}
                                onClick={() => onUpdateSettings('processMode', 'benalus')}
                                id="btn-mode-benalus"
                            >
                                🔄 BenAlus Seamless
                                <span className="process-mode-btn__sub">4-step • deflicker + fade</span>
                            </button>
                        </div>

                        <p className="card__desc">
                            {isBenalus
                                ? <>Pipeline BenAlus: Deflicker → Alpha Fade → Concat seamless → Merge audio. Durasi output: <strong>{formatDuration(settings.loopDuration)}</strong> per video.</>
                                : <>Script optimasi 2 step per video (encode keyint → loop+audio sekaligus). Durasi output: <strong>{formatDuration(settings.loopDuration)}</strong> per video.</>
                            }
                        </p>

                        {isBenalus && (
                            <div className="tip-box" style={{ background: 'rgba(14, 165, 233, 0.08)', borderColor: 'rgba(14, 165, 233, 0.25)' }}>
                                <span className="tip-box__icon">🔇</span>
                                <span className="tip-box__text" style={{ color: '#7dd3fc' }}>
                                    Audio <strong style={{ color: '#e0f2fe' }}>dimatikan</strong> selama proses loop agar tidak tabrakan. Audio digabung di step terakhir (Step D).
                                </span>
                            </div>
                        )}

                        {!isBenalus && (
                            <div className="tip-box">
                                <span className="tip-box__icon">💡</span>
                                <span className="tip-box__text">
                                    Download video dari Grok gallery, rename jadi <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>[nama]_raw.mp4</code>,
                                    taruh 1 folder dengan audio file, lalu jalankan script.
                                </span>
                            </div>
                        )}

                        {/* Batch Script */}
                        <div style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                                    📜 Batch Script — {allVideoNames.length} video ({isBenalus ? 'BenAlus' : '2-step'})
                                </span>
                            </div>

                            <div className="code-block">
                                <div className="code-block__header">
                                    <span className="code-block__lang">bash</span>
                                    <button
                                        className={`code-block__copy ${copiedId === 'batch' ? 'code-block__copy--copied' : ''}`}
                                        onClick={() => handleCopy('batch', batchScript)}
                                        id="btn-copy-batch"
                                    >
                                        {copiedId === 'batch' ? '✓ Copied!' : '📋 Copy Script'}
                                    </button>
                                </div>
                                <div className="code-block__body">
                                    <pre className="code-block__pre">{batchScript}</pre>
                                </div>
                            </div>
                        </div>

                        <div className="btn-group">
                            <button
                                className="btn btn--primary btn--full"
                                onClick={() => {
                                    const blob = new Blob([batchScript], { type: 'text/plain' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = isBenalus ? 'rainflow_benalus_batch.sh' : 'rainflow_batch.sh'
                                    a.click()
                                    URL.revokeObjectURL(url)
                                    onComplete?.()
                                }}
                                id="btn-download-script"
                            >
                                💾 Download Batch Script (.sh)
                            </button>
                            <button className="btn btn--outline" onClick={() => handleCopy('batch', batchScript)}>
                                📋 Copy to Clipboard
                            </button>
                        </div>
                    </div>

                    {/* Individual Per Video */}
                    <div className="card">
                        <h3 className="card__title">
                            <span className="card__title-icon">📝</span>
                            Script Per Video
                        </h3>
                        <div className="status-list">
                            {allVideoNames.map((name, i) => {
                                const copyId = `cmd_${i}`
                                const isFromGenerate = i < doneVideos.length
                                const img = isFromGenerate ? doneVideos[i] : null
                                return (
                                    <div className={`status-item ${isFromGenerate ? 'status-item--done' : 'status-item--manual'}`} key={name}>
                                        {img ? (
                                            <img className="status-item__thumb" src={img.preview} alt={name} />
                                        ) : (
                                            <span className="status-item__thumb-placeholder">📥</span>
                                        )}
                                        <div className="status-item__info">
                                            <p className="status-item__name">{name}.mp4</p>
                                            <p className="status-item__detail">
                                                {isBenalus ? 'BenAlus' : 'Standard'} • Loop {formatDuration(settings.loopDuration)} • CRF {settings.crf}
                                                {!isFromGenerate && ' • Manual import'}
                                            </p>
                                        </div>
                                        <button
                                            className={`btn btn--sm ${copiedId === copyId ? 'btn--success' : 'btn--outline'}`}
                                            onClick={() => handleCopy(copyId, getCommand(name))}
                                        >
                                            {copiedId === copyId ? '✓' : '📋'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
