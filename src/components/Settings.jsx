import React, { useState } from 'react'

export default function Settings({ settings, onUpdateSettings, onSaveSettings }) {
    const [open, setOpen] = useState(false)

    return (
        <div style={{ marginBottom: 16 }}>
            <button
                className="settings-toggle"
                onClick={() => setOpen(!open)}
                id="settings-toggle"
            >
                ⚙️ Pengaturan API & FFmpeg
                <span className={`settings-toggle__arrow ${open ? 'settings-toggle__arrow--open' : ''}`}>
                    ▼
                </span>
            </button>

            {open && (
                <div className="card" style={{ animation: 'fadeSlideIn 0.25s ease' }}>
                    <h3 className="card__title">
                        <span className="card__title-icon">⚙️</span>
                        Pengaturan
                    </h3>

                    <div className="settings-grid">
                        {/* GrokPI API URL */}
                        <div className="settings-field">
                            <label className="settings-field__label">GrokPI API URL</label>
                            <input
                                className="settings-field__input"
                                type="text"
                                value={settings.apiUrl}
                                onChange={e => onUpdateSettings('apiUrl', e.target.value)}
                                placeholder="(Kosongkan untuk proxy otomatis)"
                                id="input-api-url"
                            />
                        </div>

                        {/* API Key */}
                        <div className="settings-field">
                            <label className="settings-field__label">API Key</label>
                            <input
                                className="settings-field__input"
                                type="password"
                                value={settings.apiKey}
                                onChange={e => onUpdateSettings('apiKey', e.target.value)}
                                placeholder="API key GrokPI"
                                id="input-api-key"
                            />
                        </div>

                        {/* Aspect Ratio */}
                        <div className="settings-field">
                            <label className="settings-field__label">Aspect Ratio</label>
                            <select
                                className="settings-field__select"
                                value={settings.aspectRatio}
                                onChange={e => onUpdateSettings('aspectRatio', e.target.value)}
                                id="select-aspect-ratio"
                            >
                                <option value="16:9">16:9 (YouTube Landscape)</option>
                                <option value="9:16">9:16 (YouTube Shorts)</option>
                                <option value="1:1">1:1 (Square)</option>
                                <option value="3:2">3:2</option>
                                <option value="2:3">2:3</option>
                            </select>
                        </div>

                        {/* Video Duration */}
                        <div className="settings-field">
                            <label className="settings-field__label">Durasi Video (detik)</label>
                            <select
                                className="settings-field__select"
                                value={settings.duration}
                                onChange={e => onUpdateSettings('duration', Number(e.target.value))}
                                id="select-duration"
                            >
                                <option value={6}>6 detik</option>
                                <option value={10}>10 detik</option>
                            </select>
                        </div>

                        {/* Resolution */}
                        <div className="settings-field">
                            <label className="settings-field__label">Resolusi</label>
                            <select
                                className="settings-field__select"
                                value={settings.resolution}
                                onChange={e => onUpdateSettings('resolution', e.target.value)}
                                id="select-resolution"
                            >
                                <option value="480p">480p</option>
                                <option value="720p">720p</option>
                            </select>
                        </div>

                        {/* Preset */}
                        <div className="settings-field">
                            <label className="settings-field__label">Preset</label>
                            <select
                                className="settings-field__select"
                                value={settings.preset}
                                onChange={e => onUpdateSettings('preset', e.target.value)}
                                id="select-preset"
                            >
                                <option value="normal">Normal</option>
                                <option value="fun">Fun</option>
                                <option value="spicy">Spicy</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        {/* Concurrent Workers */}
                        <div className="settings-field">
                            <label className="settings-field__label">⚡ Concurrent Workers</label>
                            <select
                                className="settings-field__select"
                                value={settings.workers}
                                onChange={e => onUpdateSettings('workers', Number(e.target.value))}
                                id="select-workers"
                            >
                                <option value={1}>1 — Sequential (aman)</option>
                                <option value={2}>2 Workers</option>
                                <option value={3}>3 Workers (recommended)</option>
                                <option value={4}>4 Workers</option>
                                <option value={5}>5 Workers</option>
                                <option value={6}>6 Workers (max SSO)</option>
                            </select>
                            <span className="settings-field__help">Sesuaikan dengan jumlah SSO token aktif agar tidak bentrok.</span>
                        </div>

                        <hr className="divider" style={{ gridColumn: '1 / -1', margin: '8px 0' }} />

                        {/* Loop Duration */}
                        <div className="settings-field">
                            <label className="settings-field__label">Loop Duration (detik)</label>
                            <select
                                className="settings-field__select"
                                value={settings.loopDuration}
                                onChange={e => onUpdateSettings('loopDuration', Number(e.target.value))}
                                id="select-loop-duration"
                            >
                                <option value={3600}>1 Jam (3600s)</option>
                                <option value={7200}>2 Jam (7200s)</option>
                                <option value={10800}>3 Jam (10800s)</option>
                                <option value={14400}>4 Jam (14400s)</option>
                                <option value={18000}>5 Jam (18000s)</option>
                                <option value={36000}>10 Jam (36000s)</option>
                            </select>
                            <span className="settings-field__help">Durasi total video YouTube setelah di-loop</span>
                        </div>

                        {/* CRF Quality */}
                        <div className="settings-field">
                            <label className="settings-field__label">CRF Quality</label>
                            <select
                                className="settings-field__select"
                                value={settings.crf}
                                onChange={e => onUpdateSettings('crf', Number(e.target.value))}
                                id="select-crf"
                            >
                                <option value={18}>18 — Ultra High (file besar)</option>
                                <option value={23}>23 — High (recommended)</option>
                                <option value={28}>28 — Medium</option>
                                <option value={33}>33 — Low (file kecil)</option>
                            </select>
                        </div>

                        {/* Audio File */}
                        <div className="settings-field settings-field--full">
                            <label className="settings-field__label">Audio File Path</label>
                            <input
                                className="settings-field__input"
                                type="text"
                                value={settings.audioFile}
                                onChange={e => onUpdateSettings('audioFile', e.target.value)}
                                placeholder="rain_audio.mp3"
                                id="input-audio-file"
                            />
                            <span className="settings-field__help">Path file audio yang akan digabung (harus ada di folder yang sama saat menjalankan script)</span>
                        </div>

                        <hr className="divider" style={{ gridColumn: '1 / -1', margin: '8px 0' }} />

                        {/* BenAlus Process Mode */}
                        <div className="settings-field settings-field--full">
                            <label className="settings-field__label">🔄 Process Mode (FFmpeg)</label>
                            <select
                                className="settings-field__select"
                                value={settings.processMode}
                                onChange={e => onUpdateSettings('processMode', e.target.value)}
                                id="select-process-mode"
                            >
                                <option value="standard">🔁 Standard — 2-step (keyint loop)</option>
                                <option value="benalus">🔄 BenAlus — 4-step (deflicker + fade seamless)</option>
                            </select>
                            <span className="settings-field__help">BenAlus mode menghasilkan transisi loop yang lebih mulus dengan alpha-fade</span>
                        </div>

                        {settings.processMode === 'benalus' && (
                            <>
                                <div className="settings-field">
                                    <label className="settings-field__label">Durasi Video Asli (detik)</label>
                                    <input
                                        className="settings-field__input"
                                        type="number"
                                        value={settings.videoDuration}
                                        min={1} step={1}
                                        onChange={e => onUpdateSettings('videoDuration', Number(e.target.value))}
                                        id="input-video-duration"
                                    />
                                    <span className="settings-field__help">Durasi awal video sebelum di-loop</span>
                                </div>

                                <div className="settings-field">
                                    <label className="settings-field__label">Fade Duration (detik)</label>
                                    <input
                                        className="settings-field__input"
                                        type="number"
                                        value={settings.fadeDuration}
                                        min={0.1} max={3} step={0.1}
                                        onChange={e => onUpdateSettings('fadeDuration', Number(e.target.value))}
                                        id="input-fade-duration"
                                    />
                                </div>

                                <div className="settings-field">
                                    <label className="settings-field__label">Preprocessing</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={settings.enableDeflicker}
                                                onChange={e => onUpdateSettings('enableDeflicker', e.target.checked)} />
                                            💡 Deflicker
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={settings.enableStabilization}
                                                onChange={e => onUpdateSettings('enableStabilization', e.target.checked)} />
                                            🔧 Stabilization
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', textAlign: 'right' }}>
                        <button 
                            className="btn btn--primary btn--sm" 
                            onClick={onSaveSettings}
                            style={{ padding: '8px 16px', fontWeight: 'bold' }}
                            id="btn-save-all-settings"
                        >
                            💾 Save All Settings as Default
                        </button>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                            Settings akan tersimpan di akun/browser Anda dan dimuat otomatis saat dibuka kembali.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
