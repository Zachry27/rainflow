import React, { useState } from 'react'
import { Settings, Plug, HardDrive, Video, RefreshCw, Save } from 'lucide-react'
import GoogleDrive from './GoogleDrive'

export default function SettingsPage({ settings, onUpdateSettings, onSaveSettings, setDriveToken, setDriveUser }) {
    const [activeTab, setActiveTab] = useState('api')

    return (
        <div>
            <div className="card">
                <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Settings size={20} className="card__title-icon" />
                    Pengaturan
                </h3>

                <div className="sheet__tabs" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    {[
                        { id: 'api', label: <><Plug size={16} /> API</> },
                        { id: 'drive', label: <><HardDrive size={16} /> Drive</> },
                        { id: 'video', label: <><Video size={16} /> Video</> },
                        { id: 'ffmpeg', label: <><RefreshCw size={16} /> Looping</> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`sheet__tab ${activeTab === tab.id ? 'sheet__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="sheet__body" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
                    {activeTab === 'drive' && (
                        <div className="sheet__section">
                            <div className="settings-field">
                                <label className="settings-field__label">Integrasi Google Drive</label>
                                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
                                    Isi Client ID dan klik Hubungkan untuk mengambil gambar dari Drive dan upload video.
                                </p>
                                <GoogleDrive onTokenChange={setDriveToken} onUserChange={setDriveUser} />
                            </div>
                            <div className="settings-field" style={{ marginTop: 16 }}>
                                <label className="settings-field__label">Auto Upload & Hapus Lokal</label>
                                <label className="sheet__checkbox-label" style={{ marginTop: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.autoUploadAndDelete ?? true}
                                        onChange={e => onUpdateSettings('autoUploadAndDelete', e.target.checked)}
                                    />
                                    Otomatis upload ke Drive & hapus lokal setelah looping selesai
                                </label>
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
                                />
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Concurrent Workers</label>
                                <select
                                    className="settings-field__select"
                                    value={settings.workers}
                                    onChange={e => onUpdateSettings('workers', Number(e.target.value))}
                                >
                                    <option value={1}>1 - Sequential (aman)</option>
                                    <option value={2}>2 Workers</option>
                                    <option value={3}>3 Workers (recommended)</option>
                                    <option value={4}>4 Workers</option>
                                    <option value={5}>5 Workers</option>
                                    <option value={6}>6 Workers (max SSO)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="sheet__section">
                            <div className="settings-field">
                                <label className="settings-field__label">Aspect Ratio</label>
                                <select className="settings-field__select" value={settings.aspectRatio} onChange={e => onUpdateSettings('aspectRatio', e.target.value)}>
                                    <option value="16:9">16:9 (YouTube Landscape)</option>
                                    <option value="9:16">9:16 (YouTube Shorts)</option>
                                    <option value="1:1">1:1 (Square)</option>
                                    <option value="3:2">3:2</option>
                                    <option value="2:3">2:3</option>
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Durasi Video (detik)</label>
                                <select className="settings-field__select" value={settings.duration} onChange={e => onUpdateSettings('duration', Number(e.target.value))}>
                                    <option value={6}>6 detik</option>
                                    <option value={10}>10 detik</option>
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Resolusi</label>
                                <select className="settings-field__select" value={settings.resolution} onChange={e => onUpdateSettings('resolution', e.target.value)}>
                                    <option value="480p">480p</option>
                                    <option value="720p">720p</option>
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Preset</label>
                                <select className="settings-field__select" value={settings.preset} onChange={e => onUpdateSettings('preset', e.target.value)}>
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
                                <label className="settings-field__label">Loop Mode</label>
                                <select className="settings-field__select" value={settings.loopMode} onChange={e => onUpdateSettings('loopMode', e.target.value)}>
                                    <option value="alpha_fade">Alpha Fade Overlay (Smooth)</option>
                                    <option value="split_trim">Split-Trim (Advanced)</option>
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Parallel Limit (Server RDP)</label>
                                <input className="settings-field__input" type="number" value={settings.parallelLimit} onChange={e => onUpdateSettings('parallelLimit', Number(e.target.value))} min="1" max="20" />
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Fade Duration (detik)</label>
                                <input className="settings-field__input" type="number" value={settings.fadeDuration} onChange={e => onUpdateSettings('fadeDuration', Number(e.target.value))} min="0.5" max="5" step="0.1" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="btn-group" style={{ marginTop: 16 }}>
                    <button className="btn btn--primary" onClick={onSaveSettings} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Save as Default
                    </button>
                </div>
            </div>
        </div>
    )
}
