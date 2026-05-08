import React, { useState, useEffect, useRef } from 'react';
import './BenAlus.css';

import { Link, UploadCloud, Play, Settings as SettingsIcon, Music, CheckCircle, XCircle, Activity, Info, Sparkles, Server } from 'lucide-react';

let socket = null;

export default function StepProcess({ images, onImagesChange, outputNames, onComplete, settings, onUpdateSettings, onJobCompleted, isActive = true }) {
  // ─── Mode: 'connected' (pakai Step 2) atau 'standalone' (manual) ───
  const [mode, setMode] = useState('connected');

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [standaloneVideos, setStandaloneVideos] = useState([]); // file objects (standalone)
  const [audioName, setAudioName] = useState(''); // selected audio filename from library
  const [audioList, setAudioList] = useState([]); // list from /api/audio-list
  const [jobs, setJobs] = useState([]);
  // Pakai URL relatif — semua di-proxy Vite ke backend port 3000 secara internal
  const backendUrl = '';
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('unknown'); // 'online' | 'offline' | 'unknown'

  // Video dari Step 2 yg sudah selesai generate
  const readyImages = (images || []).filter(img => img.status === 'done' && img.videoUrl);

  // ─── Socket.IO + Settings load ───
  useEffect(() => {

    // Ambil daftar audio dari library
    fetch('/api/audio-list')
      .then(res => res.json())
      .then(data => setAudioList(data.files || []))
      .catch(() => setAudioList([]));

    import('https://cdn.socket.io/4.7.4/socket.io.esm.min.js').then((module) => {
      const io = module.io || module.default;
      // Konek Socket.IO via Vite proxy (port 5173, bukan 3000)
      socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket', 'polling'] });

      socket.on('connect', () => setBackendStatus('online'));
      socket.on('disconnect', () => setBackendStatus('offline'));

      socket.on('job_status', (data) => {
        setJobs(prev => {
          const existing = prev.find(j => j.id === data.id);
          if (existing) return prev.map(j => j.id === data.id ? { ...j, ...data } : j);
          return [{ ...data }, ...prev];
        });
      });
    }).catch(err => console.error("Gagal load socket.io", err));

    return () => { if (socket) socket.disconnect(); };
  }, [backendUrl]);

  // Track which jobs have already triggered onJobCompleted to avoid duplicates
  const processedJobsRef = useRef(new Set());

  // ─── Sync hasil ke Step 4 (hanya mode connected) ───
  useEffect(() => {
    if (mode !== 'connected') return;
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.imageId);
    if (completedJobs.length === 0 || !onImagesChange || !images) return;

    let changed = false;
    const newImages = [...images];
    completedJobs.forEach(job => {
      const idx = newImages.findIndex(img => img.id === job.imageId);
      if (idx === -1) return;

      // Update videoUrl only if it hasn't been set to a /downloads/ result yet
      const currentUrl = newImages[idx].videoUrl || '';
      if (!currentUrl.includes('/downloads/')) {
        newImages[idx] = { ...newImages[idx], videoUrl: `${backendUrl}${job.resultUrl}` };
        changed = true;
      }

      // Fire onJobCompleted exactly once per job
      if (onJobCompleted && !processedJobsRef.current.has(job.id)) {
        processedJobsRef.current.add(job.id);
        const outName = (outputNames && outputNames[idx]) ? outputNames[idx] : `video_${idx}`;
        onJobCompleted(job, newImages[idx], outName);
      }
    });

    if (changed) {
      onImagesChange(newImages);
      const connectedJobs = jobs.filter(j => j.status === 'completed' && j.imageId);
      if (connectedJobs.length >= readyImages.length && onComplete) onComplete();
    }
  }, [jobs, images, onImagesChange, backendUrl, mode, readyImages.length, onComplete, outputNames, onJobCompleted]);



  // ─── Kirim satu video ke backend ───
  const sendVideo = async (videoSource, fileName, imageId = null) => {
    const formData = new FormData();
    if (typeof videoSource === 'string') {
      formData.append('videoUrl', videoSource);
      formData.append('fileName', fileName);
    } else {
      const file = videoSource instanceof File ? videoSource : new File([videoSource], fileName, { type: 'video/mp4' });
      formData.append('video', file);
    }
    // Kirim nama file audio dari library (tidak upload file)
    if ((settings.enableAudio === true || settings.enableAudio === 'true') && audioName) {
      formData.append('audioName', audioName);
    }
    const settingsToSend = { ...settings, deflicker: settings.enableDeflicker, deshake: settings.enableStabilization };
    Object.keys(settingsToSend).forEach(key => {
      // Convert hours to duration before sending to backend if outputType is hours
      if (key === 'outputType' && settingsToSend.outputType === 'hours') {
          formData.append(key, 'duration');
      } else if (key === 'outputHours') {
          // don't send outputHours directly
      } else if (key === 'outputDuration' && settingsToSend.outputType === 'hours') {
          formData.append(key, settingsToSend.outputHours * 3600);
      } else {
          formData.append(key, settingsToSend[key])
      }
    });
    if (imageId) formData.append('imageId', imageId);

    const res = await fetch('/api/process', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  };

  // ─── Start: Connected Mode ───
  const handleStartConnected = async () => {
    if (readyImages.length === 0) return showToast("Belum ada video dari Step 2 yang siap diproses!", true);
    if (settings.enableAudio && !audioName) return showToast("Pilih file audio dari library atau matikan Enable Audio.", true);
    
    setIsProcessing(true);
    let ok = 0;
    showToast(`Mengirim ${readyImages.length} video ke antrean BenAlus...`);
    
    const sendPromises = readyImages.map(async (img, i) => {
      const originalIndex = (images || []).findIndex(m => m.id === img.id);
      const outName = (outputNames && outputNames[originalIndex]) ? outputNames[originalIndex] : `video_${i}`;
      try {
        await sendVideo(img.videoUrl, `${outName}_raw.mp4`, img.id);
        return { success: true };
      } catch (err) {
        return { success: false, name: outName, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    results.forEach(res => {
      if (res.success) ok++;
      else showToast(`Gagal video ${res.name}: ${res.error}`, true);
    });

    setIsProcessing(false);
    if (ok > 0) showToast(`${ok} video masuk antrean BenAlus! Status tampil di bawah.`);
  };

  // ─── Start: Standalone Mode ───
  const handleStartStandalone = async () => {
    if (standaloneVideos.length === 0) return showToast("Pilih minimal 1 file video!", true);
    if (settings.enableAudio && !audioName) return showToast("Pilih file audio dari library atau matikan Enable Audio.", true);
    setIsProcessing(true);
    let ok = 0;
    for (const file of standaloneVideos) {
      try {
        await sendVideo(file, file.name, null);
        ok++;
      } catch (err) {
        showToast(`Gagal video ${file.name}: ${err.message}`, true);
      }
    }
    setIsProcessing(false);
    setStandaloneVideos([]);
    if (ok > 0) showToast(`${ok} video masuk antrean BenAlus! Status tampil di bawah.`);
  };

  const canStart = backendStatus === 'online' && !isProcessing;
  // URL untuk download hasil — pakai relatif via proxy
  const downloadBase = '';

  // ─── UI ───
  return (
    <div className="benalus-container" style={{ position: 'relative' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          background: toastMessage.isError ? '#ef4444' : '#10b981', color: 'white',
          padding: '10px 20px', borderRadius: '8px', zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', animation: 'fadeSlideIn 0.3s ease'
        }}>
          {toastMessage.isError ? '⚠️' : '✅'} {toastMessage.text}
        </div>
      )}

      {/* ── Backend Status Bar ── */}
      <div className="status-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`status-dot ${backendStatus}`} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Server size={16} /> Backend BenAlus:
          {backendStatus === 'online' ? <strong style={{ color: '#4ade80' }}>Online</strong>
            : backendStatus === 'offline' ? <strong style={{ color: '#f87171' }}>Offline — Jalankan server.cjs!</strong>
            : <strong style={{ color: '#fbbf24' }}>Memeriksa...</strong>}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>{window.location.origin} (proxy)</span>
      </div>

      {/* ── Mode Selector ── */}
      <div className="mode-toggle-wrapper">
        <button
          className={`mode-toggle-btn ${mode === 'connected' ? 'active' : ''}`}
          onClick={() => setMode('connected')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Link size={18} /> Mode Terkoneksi</div>
          <span className="mode-desc">Otomatis dari Step 2 → Step 4</span>
        </button>
        <button
          className={`mode-toggle-btn ${mode === 'standalone' ? 'active' : ''}`}
          onClick={() => setMode('standalone')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UploadCloud size={18} /> Mode Standalone</div>
          <span className="mode-desc">Upload video manual, bebas</span>
        </button>
      </div>

      {/* ── INPUT PANEL ── */}
      {mode === 'connected' ? (
        <div className="glass-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Link size={20} style={{ color: 'var(--accent)' }} /> Video dari Step 2 (Auto-Pull)</h2>
          <p style={{ color: '#94a3b8', marginBottom: '15px', fontSize: '0.9rem' }}>
            Video yang selesai di-generate di Step 2 otomatis masuk ke sini. Hasil proses akan otomatis diteruskan ke Step 4.
          </p>
          {readyImages.length === 0 ? (
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: 'var(--text-dim)' }}><Info size={32} /></div>
              <p>Belum ada video siap dari Step 2.</p>
              <p style={{ fontSize: '0.8rem' }}>Selesaikan Step 2 (Generate) terlebih dahulu.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {readyImages.map((img, i) => {
                const origIdx = (images || []).findIndex(m => m.id === img.id);
                const outName = (outputNames && outputNames[origIdx]) ? outputNames[origIdx] : `video_${i}`;
                const isDone = jobs.find(j => j.imageId === img.id && j.status === 'completed');
                return (
                  <div key={img.id} style={{
                    padding: '8px 12px',
                    background: isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.2)',
                    border: `1px solid ${isDone ? 'rgba(34, 197, 94, 0.5)' : 'rgba(99, 102, 241, 0.5)'}`,
                    borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    {isDone ? <CheckCircle size={14} style={{ color: 'var(--success)' }} /> : <Play size={14} style={{ color: 'var(--accent)' }} />} {outName}_raw.mp4
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UploadCloud size={20} style={{ color: 'var(--accent)' }} /> Upload Video Manual</h2>
          <p style={{ color: '#94a3b8', marginBottom: '15px', fontSize: '0.9rem' }}>
            Upload video apa saja dari komputer Anda. Hasil hanya bisa didownload, tidak terhubung ke Step 4.
          </p>
          <div className="form-group">
            <label>Video Input (Bisa Multiple / Batch)</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={e => setStandaloneVideos(Array.from(e.target.files))}
            />
          </div>
          {standaloneVideos.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {standaloneVideos.map((f, i) => (
                <span key={i} style={{
                  padding: '5px 10px', background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: '6px', fontSize: '0.8rem'
                }}>
                  🎬 {f.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Audio Input (shared) ── */}
      <div className="glass-panel" style={{ padding: '20px 30px' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="enableAudio" name="enableAudio" checked={settings.enableAudio} onChange={e => onUpdateSettings('enableAudio', e.target.checked)} />
          <label htmlFor="enableAudio" style={{ marginBottom: 0 }}>Enable Audio Background</label>
        </div>
        {settings.enableAudio && (
          <div className="form-group" style={{ marginTop: '15px' }}>
            <label>🎵 Pilih Audio dari Library</label>
            {audioList.length === 0 ? (
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                ⚠️ Belum ada file audio. Tambahkan file <code>.mp3</code> / <code>.wav</code> ke folder{' '}
                <code style={{ color: '#a5b4fc' }}>public/audio/</code> lalu refresh halaman.
              </div>
            ) : (
              <select
                value={audioName}
                onChange={e => setAudioName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                <option value="">-- Pilih Audio --</option>
                {audioList.map(f => (
                  <option key={f.name} value={f.name}>
                    🎵 {f.name}  ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                  </option>
                ))}
              </select>
            )}
            {audioName && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <audio controls src={`/audio-assets/${encodeURIComponent(audioName)}`} style={{ flex: 1, height: '36px', width: '100%', borderRadius: '6px' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Start Process Panel ── */}
      <div className="glass-panel" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={18} style={{ color: 'var(--accent)' }} /> Siap Memproses Video
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span>⚙️ Mode: <strong style={{ color: '#fff' }}>{settings.loopMode}</strong></span>
                      <span>⚡ Pekerja: <strong style={{ color: '#fff' }}>{settings.parallelLimit}</strong></span>
                      <span>⏱️ Durasi: <strong style={{ color: '#fff' }}>{settings.outputType === 'hours' ? `${settings.outputHours} Jam` : settings.outputType === 'count' ? `${settings.outputCount} Loop` : `${settings.outputDuration}s`}</strong></span>
                      <span style={{ fontStyle: 'italic', opacity: 0.7 }}>(Ubah di Pengaturan)</span>
                  </div>
              </div>
              <button
                className="btn-primary"
                onClick={mode === 'connected' ? handleStartConnected : handleStartStandalone}
                disabled={!canStart}
                style={{ opacity: canStart ? 1 : 0.5, margin: 0, padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {isProcessing ? <><span className="spinner" /> MENGIRIM...</> : <><Sparkles size={18} /> MULAI PROSES PARALEL</>}
              </button>
          </div>
      </div>

      {/* ── Job Status Panel ── */}
      {jobs.length > 0 && isActive && (
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={20} style={{ color: 'var(--success)' }} /> Status Pemrosesan</h2>
            <button
              onClick={() => setJobs([])}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
            >
              Bersihkan Log
            </button>
          </div>
          <div>
            {jobs.map(job => (
              <div key={job.id} className="job-card">
                <div className="job-header">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem' }}>#{job.id}</strong>
                    {job.imageId && (
                      <span style={{ fontSize: '0.75rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        🔗 {job.imageId.slice(-6)}
                      </span>
                    )}
                  </div>
                  <span className={`badge ${job.status}`}>
                    {job.status === 'processing' ? <><SettingsIcon size={12} className="spin-icon" /> Processing</>
                      : job.status === 'completed' ? <><CheckCircle size={12} /> Selesai</>
                      : <><XCircle size={12} /> Error</>}
                  </span>
                </div>
                {job.log && <div className="log-view">&gt; {job.log}</div>}
                {job.resultUrl && (
                  <a href={job.resultUrl} className="download-btn" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <UploadCloud size={14} style={{ transform: 'rotate(180deg)' }} /> Download Hasil
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
