import React, { useState, useCallback, useRef } from 'react'

export default function StepUpload({ images, onImagesChange, settings, onUpdateSettings, outputNames }) {
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef(null)

    const handleFiles = useCallback((files) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
        const newImages = imageFiles.map(file => ({
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            file,
            name: file.name,
            preview: URL.createObjectURL(file),
            status: 'pending', // pending | generating | done | error
            videoUrl: null,
            error: null,
        }))
        onImagesChange([...images, ...newImages])
    }, [images, onImagesChange])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        setDragging(true)
    }, [])

    const handleDragLeave = useCallback(() => setDragging(false), [])

    const removeImage = useCallback((id) => {
        onImagesChange(images.filter(img => img.id !== id))
    }, [images, onImagesChange])

    const clearAll = useCallback(() => {
        images.forEach(img => URL.revokeObjectURL(img.preview))
        onImagesChange([])
    }, [images, onImagesChange])

    return (
        <div>
            <div className="card">
                <h3 className="card__title">
                    <span className="card__title-icon">📁</span>
                    Step 1 — Import Gambar Referensi
                </h3>
                <p className="card__desc">
                    <strong>Drag & drop</strong> atau klik area di bawah untuk mengimpor gambar referensi.
                    Setiap gambar akan digunakan sebagai referensi untuk generate video melalui AI.
                </p>

                {/* Dropzone */}
                <div
                    className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    id="dropzone"
                >
                    <span className="dropzone__icon">📸</span>
                    <p className="dropzone__text">
                        {dragging ? '💫 Lepas file di sini...' : 'Drag & Drop gambar ke sini'}
                    </p>
                    <p className="dropzone__hint">
                        Atau klik untuk browse • JPG, PNG, WebP • Bisa pilih banyak sekaligus
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => handleFiles(e.target.files)}
                        style={{ display: 'none' }}
                        id="file-input"
                    />
                </div>

                {/* Image Grid */}
                {images.length > 0 && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                📷 {images.length} gambar diimpor
                            </span>
                            <button className="btn btn--danger btn--sm" onClick={clearAll} id="btn-clear-all">
                                🗑️ Hapus Semua
                            </button>
                        </div>

                        <div className="image-grid" id="image-grid">
                            {images.map((img, index) => (
                                <div className="image-card" key={img.id}>
                                    <img className="image-card__img" src={img.preview} alt={img.name} />
                                    <div className="image-card__overlay">
                                        <span className="image-card__name" title={outputNames[index] || img.name}>
                                            {outputNames[index] || img.name}
                                        </span>
                                    </div>
                                    <button
                                        className="image-card__remove"
                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                                        title="Hapus gambar"
                                    >
                                        ✕
                                    </button>
                                    {img.status !== 'pending' && (
                                        <span className={`image-card__status image-card__status--${img.status}`}>
                                            {img.status === 'generating' ? '⏳ Gen...' :
                                                img.status === 'done' ? '✓ Done' :
                                                    img.status === 'error' ? '✕ Error' : img.status}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Naming Configuration */}
            {images.length > 0 && (
                <div className="card">
                    <h3 className="card__title">
                        <span className="card__title-icon">🏷️</span>
                        Auto-Naming Output
                    </h3>
                    <p className="card__desc">
                        Setiap video akan diberi nama otomatis berdasarkan <strong>prefix + tanggal + bulan</strong>.
                        Contoh: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>crs0212</code> = prefix "crs", tanggal 02, bulan 12.
                    </p>

                    <div className="naming-config">
                        <div className="settings-field">
                            <label className="settings-field__label">Prefix</label>
                            <input
                                className="settings-field__input"
                                type="text"
                                value={settings.namePrefix}
                                onChange={e => onUpdateSettings('namePrefix', e.target.value)}
                                placeholder="crs"
                                maxLength={10}
                                id="input-name-prefix"
                            />
                        </div>

                        <div className="settings-field">
                            <label className="settings-field__label">Tanggal Mulai</label>
                            <input
                                className="settings-field__input"
                                type="date"
                                value={settings.startDate}
                                onChange={e => onUpdateSettings('startDate', e.target.value)}
                                id="input-start-date"
                            />
                            <span className="settings-field__help">Kosongkan = mulai besok</span>
                        </div>

                        <div className="settings-field">
                            <label className="settings-field__label">Jumlah</label>
                            <input
                                className="settings-field__input"
                                type="text"
                                value={`${images.length} video`}
                                disabled
                                style={{ opacity: 0.6 }}
                            />
                        </div>

                        {/* Preview nama output */}
                        <div className="naming-preview">
                            <p className="naming-preview__title">Preview Nama Output</p>
                            <div className="naming-preview__list">
                                {outputNames.slice(0, 10).map((name, i) => (
                                    <span className="naming-preview__tag" key={i}>
                                        {name}
                                    </span>
                                ))}
                                {outputNames.length > 10 && (
                                    <span className="naming-preview__tag" style={{ opacity: 0.5 }}>
                                        +{outputNames.length - 10} lagi...
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="tip-box">
                        <span className="tip-box__icon">💡</span>
                        <span className="tip-box__text">
                            <strong>Format:</strong> {settings.namePrefix || 'vid'}DDMM — Nama ini akan digunakan sebagai nama file video output.
                            Upload berurutan sesuai tanggal yang ditentukan untuk mempermudah scheduling.
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
