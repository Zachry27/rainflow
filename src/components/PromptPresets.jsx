import React, { useState, useEffect, useCallback } from 'react'
import { Save, Star, X } from 'lucide-react'

const STORAGE_KEY = 'rainflow_prompt_presets'

function loadPresets() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

function savePresets(presets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
    fetch('/api/app-data/prompt_presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: presets })
    }).catch(() => {})
}

export default function PromptPresets({ currentPrompt, onApply }) {
    const [presets, setPresets] = useState(loadPresets)
    const [saveName, setSaveName] = useState('')
    const [saving, setSaving] = useState(false)

    // Sync with server on mount
    useEffect(() => {
        let isFirstLoad = true;
        fetch('/api/app-data/prompt_presets')
            .then(res => res.json())
            .then(res => {
                if (res.data && Array.isArray(res.data)) {
                    setPresets(res.data)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
                    const def = res.data.find(p => p.isDefault)
                    if (def && !currentPrompt) onApply(def.prompt)
                    isFirstLoad = false;
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isFirstLoad) {
                    const def = loadPresets().find(p => p.isDefault)
                    if (def && !currentPrompt) onApply(def.prompt)
                }
            })
    }, []) // eslint-disable-line

    const handleSave = useCallback(() => {
        if (!saveName.trim() || !currentPrompt.trim()) return
        const existing = presets.find(p => p.name === saveName.trim())
        const newPreset = {
            id: existing?.id || `preset_${Date.now()}`,
            name: saveName.trim(),
            prompt: currentPrompt,
            isDefault: existing?.isDefault || false,
        }
        const updated = existing
            ? presets.map(p => p.id === newPreset.id ? newPreset : p)
            : [...presets, newPreset]
        setPresets(updated)
        savePresets(updated)
        setSaveName('')
        setSaving(false)
    }, [presets, saveName, currentPrompt])

    const handleDelete = useCallback((id) => {
        const updated = presets.filter(p => p.id !== id)
        setPresets(updated)
        savePresets(updated)
    }, [presets])

    const handleSetDefault = useCallback((id) => {
        const updated = presets.map(p => ({ ...p, isDefault: p.id === id }))
        setPresets(updated)
        savePresets(updated)
    }, [presets])

    const handleApply = useCallback((preset) => {
        onApply(preset.prompt)
    }, [onApply])

    if (presets.length === 0 && !saving) {
        return (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Belum ada preset tersimpan.</span>
                <button className="btn btn--sm btn--outline" onClick={() => setSaving(true)} id="btn-save-preset-first" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Save size={14} /> Simpan Prompt Ini
                </button>
            </div>
        )
    }

    return (
        <div className="preset-panel">
            {/* Preset list */}
            {presets.length > 0 && (
                <div className="preset-list">
                    {presets.map(preset => (
                        <div className="preset-tag" key={preset.id}>
                            <button
                                className={`preset-tag__name ${preset.isDefault ? 'preset-tag__name--default' : ''}`}
                                onClick={() => handleApply(preset)}
                                title={preset.prompt}
                            >
                                {preset.isDefault && <Star size={12} fill="currentColor" style={{ marginRight: 4, color: '#f59e0b' }} />}
                                {preset.name}
                            </button>
                            <button
                                className="preset-tag__action"
                                title="Jadikan default"
                                onClick={() => handleSetDefault(preset.id)}
                            >
                                <Star size={14} fill={preset.isDefault ? "currentColor" : "none"} style={{ color: preset.isDefault ? '#f59e0b' : 'inherit' }} />
                            </button>
                            <button
                                className="preset-tag__action preset-tag__action--del"
                                title="Hapus preset"
                                onClick={() => handleDelete(preset.id)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Save area */}
            {saving ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    <input
                        className="settings-field__input"
                        style={{ flex: 1, minWidth: 150, padding: '6px 10px', fontSize: 12 }}
                        type="text"
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder="Nama preset..."
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoFocus
                        id="input-preset-name"
                    />
                    <button className="btn btn--sm btn--primary" onClick={handleSave} disabled={!saveName.trim()}>
                        Simpan
                    </button>
                    <button className="btn btn--sm btn--outline" onClick={() => { setSaving(false); setSaveName('') }}>
                        Batal
                    </button>
                </div>
            ) : (
                <button className="btn btn--sm btn--outline" style={{ marginTop: presets.length ? 8 : 0, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setSaving(true)} id="btn-save-preset">
                    <Save size={14} /> Simpan Prompt Ini
                </button>
            )}
        </div>
    )
}
