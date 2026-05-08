import React, { useState } from 'react'
import { Settings, Plug, HardDrive, Video, RefreshCw, Type, Save } from 'lucide-react'
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
                    <h2 className="sheet__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Settings size={20} /> Pengaturan
                    </h2>
                    <button className="sheet__close" onClick={onClose} id="settings-sheet-close">✕</button>
                </div>

                {/* Tabs */}
                <div className="sheet__tabs">
                    {[
                        { id: 'api',    label: <><Plug size={16} /> API</> },
                        { id: 'drive',  label: <><HardDrive size={16} /> Drive</> },
                        { id: 'video',  label: <><Video size={16} /> Video</> },
                        { id: 'ffmpeg', label: <><RefreshCw size={16} /> Looping</> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`sheet__tab ${activeTab === tab.id ? 'sheet__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            id={`settings-tab-${tab.id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
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
                                <label className="settings-field__label">🔄 Loop Mode</label>
                                <select
                                    className="settings-field__select"
                                    value={settings.loopMode}
                                    onChange={e => onUpdateSettings('loopMode', e.target.value)}
                                    id="select-loop-mode"
                                >
                                    <option value="alpha_fade">Alpha Fade Overlay (Smooth)</option>
                                    <option value="split_trim">Split-Trim (Advanced)</option>
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Parallel Limit (Server RDP)</label>
                                <input
                                    className="settings-field__input"
                                    type="number"
                                    value={settings.parallelLimit}
                                    onChange={e => onUpdateSettings('parallelLimit', Number(e.target.value))}
                                    min="1" max="20"
                                    id="input-parallel-limit"
                                />
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Fade Duration (detik)</label>
                                <input
                                    className="settings-field__input"
                                    type="number"
                                    value={settings.fadeDuration}
                                    onChange={e => onUpdateSettings('fadeDuration', Number(e.target.value))}
                                    min="0.5" max="5" step="0.1"
                                    id="input-fade-duration"
                                />
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Preprocessing</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <label className="sheet__checkbox-label">
                                        <input type="checkbox" checked={settings.enableStabilization}
                                            onChange={e => onUpdateSettings('enableStabilization', e.target.checked)} />
                                        🔧 Stabilisasi (Deshake)
                                    </label>
                                    <label className="sheet__checkbox-label">
                                        <input type="checkbox" checked={settings.enableDeflicker}
                                            onChange={e => onUpdateSettings('enableDeflicker', e.target.checked)} />
                                        💡 Deflicker
                                    </label>
                                </div>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Mode Target Durasi</label>
                                <select
                                    className="settings-field__select"
                                    value={settings.outputType}
                                    onChange={e => onUpdateSettings('outputType', e.target.value)}
                                    id="select-output-type"
                                >
                                    <option value="hours">Berdasarkan Jam (Premium)</option>
                                    <option value="count">Berdasarkan Jumlah Loop</option>
                                    <option value="duration">Berdasarkan Durasi (Detik)</option>
                                </select>
                            </div>
                            {settings.outputType === 'hours' ? (
                                <div className="settings-field">
                                    <label className="settings-field__label">Target Durasi (Jam)</label>
                                    <input className="settings-field__input" type="number" value={settings.outputHours} onChange={e => onUpdateSettings('outputHours', Number(e.target.value))} min="1" />
                                </div>
                            ) : settings.outputType === 'count' ? (
                                <div className="settings-field">
                                    <label className="settings-field__label">Jumlah Loop</label>
                                    <input className="settings-field__input" type="number" value={settings.outputCount} onChange={e => onUpdateSettings('outputCount', Number(e.target.value))} min="1" />
                                </div>
                            ) : (
                                <div className="settings-field">
                                    <label className="settings-field__label">Durasi Total (Detik)</label>
                                    <input className="settings-field__input" type="number" value={settings.outputDuration} onChange={e => onUpdateSettings('outputDuration', Number(e.target.value))} min="5" />
                                </div>
                            )}
                        </div>
                    )}


                </div>

                <div className="sheet__footer">
                    <button className="btn btn--outline" onClick={onClose} id="settings-cancel-btn">
                        Tutup
                    </button>
                    <button className="btn btn--primary" onClick={() => { onSaveSettings(); onClose() }} id="btn-save-all-settings" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Save as Default
                    </button>
                </div>
            </div>
        </>
    )
}
