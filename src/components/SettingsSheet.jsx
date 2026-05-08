import React, { useState } from 'react'
import GoogleDrive from './GoogleDrive'

export default function SettingsSheet({ isOpen, onClose, settings, onUpdateSettings, onSaveSettings, setDriveToken, setDriveUser }) {
    const [activeTab, setActiveTab] = useState('api')

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="sheet-backdrop" onClick={onClose} id="settings-sheet-backdrop" />

            {/* Sheet */}
            <div className="sheet" id="settings-sheet" role="dialog" aria-label="Settings">
                {/* Handle */}
                <div className="sheet__handle" />

                {/* Header */}
                <div className="sheet__header">
                    <h2 className="sheet__title">⚙️ Pengaturan</h2>
                    <button className="sheet__close" onClick={onClose} id="settings-sheet-close">✕</button>
                </div>

                {/* Tabs */}
                <div className="sheet__tabs">
                    {[
                        { id: 'api',    label: '🔌 API' },
                        { id: 'drive',  label: '📂 Drive' },
                        { id: 'video',  label: '🎬 Video' },
                        { id: 'ffmpeg', label: '🔁 FFmpeg' },
                        { id: 'naming', label: '🏷️ Naming' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`sheet__tab ${activeTab === tab.id ? 'sheet__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            id={`settings-tab-${tab.id}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="sheet__body">

                    {activeTab === 'drive' && (
                        <div className="sheet__section">
                            <div className="settings-field">
                                <label className="settings-field__label">Integrasi Google Drive</label>
                                <p style={{fontSize: 13, color: 'var(--text-dim)', marginBottom: 12}}>
                                    Isi Client ID dan klik Hubungkan untuk mengambil gambar dari Drive dan mengupload video hasil generate.
                                </p>
                                <GoogleDrive onTokenChange={setDriveToken} onUserChange={setDriveUser} />
                            </div>
                            <div className="settings-field" style={{ marginTop: 16 }}>
                                <label className="settings-field__label">⚡ Auto Upload & Hapus Lokal</label>
                                <label className="sheet__checkbox-label" style={{ marginTop: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.autoUploadAndDelete ?? true}
                                        onChange={e => onUpdateSettings('autoUploadAndDelete', e.target.checked)}
                                        id="toggle-auto-upload"
                                    />
                                    Otomatis upload ke Drive & hapus lokal setelah looping selesai
                                </label>
                                <span className="settings-field__help">
                                    Setiap video yang selesai di-loop langsung dikirim ke Google Drive dan dihapus dari server BenAlus untuk menghemat penyimpanan. Membutuhkan Drive terhubung.
                                </span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="sheet__section">
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
                                <span className="settings-field__help">Sesuaikan dengan jumlah SSO token aktif.</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="sheet__section">
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
                        </div>
                    )}

                    {activeTab === 'ffmpeg' && (
                        <div className="sheet__section">
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
                            <div className="settings-field">
                                <label className="settings-field__label">Audio File Path</label>
                                <input
                                    className="settings-field__input"
                                    type="text"
                                    value={settings.audioFile}
                                    onChange={e => onUpdateSettings('audioFile', e.target.value)}
                                    placeholder="rain_audio.mp3"
                                    id="input-audio-file"
                                />
                                <span className="settings-field__help">Path file audio yang akan digabung</span>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">🔄 Process Mode</label>
                                <select
                                    className="settings-field__select"
                                    value={settings.processMode}
                                    onChange={e => onUpdateSettings('processMode', e.target.value)}
                                    id="select-process-mode"
                                >
                                    <option value="standard">🔁 Standard — 2-step (keyint loop)</option>
                                    <option value="benalus">🔄 BenAlus — 4-step (deflicker + fade seamless)</option>
                                </select>
                                <span className="settings-field__help">BenAlus mode menghasilkan transisi loop lebih mulus</span>
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <label className="sheet__checkbox-label">
                                                <input type="checkbox" checked={settings.enableDeflicker}
                                                    onChange={e => onUpdateSettings('enableDeflicker', e.target.checked)} />
                                                💡 Deflicker
                                            </label>
                                            <label className="sheet__checkbox-label">
                                                <input type="checkbox" checked={settings.enableStabilization}
                                                    onChange={e => onUpdateSettings('enableStabilization', e.target.checked)} />
                                                🔧 Stabilization
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'naming' && (
                        <div className="sheet__section">
                            <div className="settings-field">
                                <label className="settings-field__label">Name Prefix</label>
                                <input
                                    className="settings-field__input"
                                    type="text"
                                    value={settings.namePrefix}
                                    onChange={e => onUpdateSettings('namePrefix', e.target.value)}
                                    placeholder="crs"
                                    id="input-name-prefix"
                                />
                                <span className="settings-field__help">Prefix nama file output (misal: crs → crs0106)</span>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Start Date</label>
                                <input
                                    className="settings-field__input"
                                    type="date"
                                    value={settings.startDate}
                                    onChange={e => onUpdateSettings('startDate', e.target.value)}
                                    id="input-start-date"
                                />
                                <span className="settings-field__help">Tanggal awal penamaan. Kosongkan = besok</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="sheet__footer">
                    <button className="btn btn--outline" onClick={onClose} id="settings-cancel-btn">
                        Tutup
                    </button>
                    <button className="btn btn--primary" onClick={() => { onSaveSettings(); onClose() }} id="btn-save-all-settings">
                        💾 Save as Default
                    </button>
                </div>
            </div>
        </>
    )
}
