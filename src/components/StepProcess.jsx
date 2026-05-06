import React, { useState, useEffect, useRef } from 'react';
import './BenAlus.css';

let socket = null;

export default function StepProcess({ images, onImagesChange, outputNames, onComplete }) {
  // ─── Mode: 'connected' (pakai Step 2) atau 'standalone' (manual) ───
  const [mode, setMode] = useState('connected');

  const [settings, setSettings] = useState({
    parallelLimit: 4,
    loopMode: 'alpha_fade',
    deflicker: false,
    deshake: false,
    enableAudio: false,
    outputType: 'hours',
    outputCount: 6,
    outputDuration: 60,
    outputHours: 3,
    fadeDuration: 1.0
  });
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
    // Cek status backend
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(prev => ({ ...prev, ...data }));
        setBackendStatus('online');
      })
      .catch(() => setBackendStatus('offline'));

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

  // ─── Sync hasil ke Step 4 (hanya mode connected) ───
  useEffect(() => {
    if (mode !== 'connected') return;
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.imageId);
    if (completedJobs.length === 0 || !onImagesChange || !images) return;

    let changed = false;
    const newImages = [...images];
    completedJobs.forEach(job => {
      const idx = newImages.findIndex(img => img.id === job.imageId);
      if (idx !== -1 && !(newImages[idx].videoUrl || '').includes(':3000')) {
        newImages[idx] = { ...newImages[idx], videoUrl: `${backendUrl}${job.resultUrl}` };
        changed = true;
      }
    });

    if (changed) {
      onImagesChange(newImages);
      const connectedJobs = jobs.filter(j => j.status === 'completed' && j.imageId);
      if (connectedJobs.length >= readyImages.length && onComplete) onComplete();
    }
  }, [jobs, images, onImagesChange, backendUrl, mode, readyImages.length, onComplete]);

  // ─── Settings change ───
  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const newSettings = { ...settings, [name]: val };
    setSettings(newSettings);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    }).catch(console.error);
  };

  // ─── Kirim satu video ke backend ───
  const sendVideo = async (videoBlob, fileName, imageId = null) => {
    const file = videoBlob instanceof File ? videoBlob : new File([videoBlob], fileName, { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('video', file);
    // Kirim nama file audio dari library (tidak upload file)
    if ((settings.enableAudio === true || settings.enableAudio === 'true') && audioName) {
      formData.append('audioName', audioName);
    }
    Object.keys(settings).forEach(key => {
      // Convert hours to duration before sending to backend if outputType is hours
      if (key === 'outputType' && settings.outputType === 'hours') {
          formData.append(key, 'duration');
      } else if (key === 'outputHours') {
          // don't send outputHours directly
      } else if (key === 'outputDuration' && settings.outputType === 'hours') {
          formData.append(key, settings.outputHours * 3600);
      } else {
          formData.append(key, settings[key])
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
    for (let i = 0; i < readyImages.length; i++) {
      const img = readyImages[i];
      const originalIndex = (images || []).findIndex(m => m.id === img.id);
      const outName = (outputNames && outputNames[originalIndex]) ? outputNames[originalIndex] : `video_${i}`;
      try {
        const resp = await fetch(img.videoUrl);
        const blob = await resp.blob();
        await sendVideo(blob, `${outName}_raw.mp4`, img.id);
        ok++;
      } catch (err) {
        showToast(`Gagal video ${outName}: ${err.message}`, true);
      }
    }
    setIsProcessing(false);
    // Removed alert, just show toast
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
      <div className="status-bar">
        <span className={`status-dot ${backendStatus}`} />
        <span>
          Backend BenAlus:{' '}
          {backendStatus === 'online' ? <strong style={{ color: '#4ade80' }}>Online ✅</strong>
            : backendStatus === 'offline' ? <strong style={{ color: '#f87171' }}>Offline ❌ — Jalankan server.cjs dulu!</strong>
            : <strong style={{ color: '#fbbf24' }}>Memeriksa...</strong>}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>{window.location.origin} (proxy)</span>
      </div>

      {/* ── Mode Selector ── */}
      <div className="mode-toggle-wrapper">
        <button
          className={`mode-toggle-btn ${mode === 'connected' ? 'active' : ''}`}
          onClick={() => setMode('connected')}
        >
          🔗 Mode Terkoneksi
          <span className="mode-desc">Otomatis dari Step 2 → Step 4</span>
        </button>
        <button
          className={`mode-toggle-btn ${mode === 'standalone' ? 'active' : ''}`}
          onClick={() => setMode('standalone')}
        >
          📦 Mode Standalone
          <span className="mode-desc">Upload video manual, bebas</span>
        </button>
      </div>

      {/* ── INPUT PANEL ── */}
      {mode === 'connected' ? (
        <div className="glass-panel">
          <h2>🔗 Video dari Step 2 (Auto-Pull)</h2>
          <p style={{ color: '#94a3b8', marginBottom: '15px', fontSize: '0.9rem' }}>
            Video yang selesai di-generate di Step 2 otomatis masuk ke sini. Hasil proses akan otomatis diteruskan ke Step 4.
          </p>
          {readyImages.length === 0 ? (
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
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
                    borderRadius: '8px', fontSize: '0.85rem'
                  }}>
                    {isDone ? '✅' : '🎬'} {outName}_raw.mp4
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel">
          <h2>📦 Upload Video Manual</h2>
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
          <input type="checkbox" id="enableAudio" name="enableAudio" checked={settings.enableAudio} onChange={handleSettingChange} />
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

      {/* ── Config Grid ── */}
      <div className="grid-2">
        <div className="glass-panel">
          <h2>⚙️ Konfigurasi Looping</h2>
          <div style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Loop Mode</label>
              <select name="loopMode" value={settings.loopMode} onChange={handleSettingChange}>
                <option value="alpha_fade">Alpha Fade Overlay (Smooth)</option>
                <option value="split_trim">Split-Trim (Advanced)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Parallel Limit (Server RDP)</label>
              <input type="number" name="parallelLimit" value={settings.parallelLimit} onChange={handleSettingChange} min="1" max="20" />
            </div>
            <div className="form-group">
              <label>Fade Duration (detik)</label>
              <input type="number" name="fadeDuration" value={settings.fadeDuration} onChange={handleSettingChange} min="0.5" max="5" step="0.1" />
            </div>
            <label>Preprocessing</label>
            <div className="checkbox-group">
              <input type="checkbox" id="deshake" name="deshake" checked={settings.deshake} onChange={handleSettingChange} />
              <label htmlFor="deshake" style={{ marginBottom: 0 }}>Stabilisasi (Deshake)</label>
            </div>
            <div className="checkbox-group">
              <input type="checkbox" id="deflicker" name="deflicker" checked={settings.deflicker} onChange={handleSettingChange} />
              <label htmlFor="deflicker" style={{ marginBottom: 0 }}>Deflicker</label>
            </div>
          </div>
        </div>

        <div className="glass-panel">
          <h2>📊 Output Target</h2>
          <div style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Mode Target</label>
              <select name="outputType" value={settings.outputType} onChange={handleSettingChange}>
                <option value="hours">Berdasarkan Jam (Premium)</option>
                <option value="count">Berdasarkan Jumlah Loop</option>
                <option value="duration">Berdasarkan Durasi (Detik)</option>
              </select>
            </div>
            {settings.outputType === 'hours' ? (
              <div className="form-group">
                <label>Target Durasi (Jam)</label>
                <input type="number" name="outputHours" value={settings.outputHours} onChange={handleSettingChange} min="1" />
              </div>
            ) : settings.outputType === 'count' ? (
              <div className="form-group">
                <label>Jumlah Loop</label>
                <input type="number" name="outputCount" value={settings.outputCount} onChange={handleSettingChange} min="1" />
              </div>
            ) : (
              <div className="form-group">
                <label>Durasi Total (Detik)</label>
                <input type="number" name="outputDuration" value={settings.outputDuration} onChange={handleSettingChange} min="5" />
              </div>
            )}
            <button
              className="btn-primary"
              onClick={mode === 'connected' ? handleStartConnected : handleStartStandalone}
              disabled={!canStart}
              style={{ marginTop: '15px', opacity: canStart ? 1 : 0.5 }}
            >
              {isProcessing ? '⏳ MENGIRIM...' : '🚀 MULAI PROSES PARALEL'}
            </button>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
              {mode === 'connected'
                ? 'Hasil akan otomatis masuk ke Step 4.'
                : 'Hasil bisa didownload langsung dari panel status.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Job Status Panel ── */}
      {jobs.length > 0 && (
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>📈 Status Pemrosesan</h2>
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
                    {job.status === 'processing' ? '⚙️ Processing'
                      : job.status === 'completed' ? '✅ Selesai'
                      : '❌ Error'}
                  </span>
                </div>
                {job.log && <div className="log-view">&gt; {job.log}</div>}
                {job.resultUrl && (
                  <a href={job.resultUrl} className="download-btn" target="_blank" rel="noreferrer">
                    ⬇️ Download Hasil
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
