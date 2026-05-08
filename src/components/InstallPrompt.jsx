import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        // Cek apakah sudah dalam mode installed PWA
        const isStandalone =
            navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches;

        if (isStandalone) return;

        // Tampilkan prompt setelah 2.5 detik (meskipun belum ada beforeinstallprompt)
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, 2500);

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
            (navigator.userAgent.toLowerCase().includes('mac') && 'ontouchend' in document);

        if (deferredPrompt) {
            setInstalling(true);
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') setShowPrompt(false);
            } catch (err) {
                console.error(err);
            }
            setInstalling(false);
            setDeferredPrompt(null);
        } else if (isIOS) {
            setShowTutorial(true);
        } else {
            setShowTutorial(true);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <>
            <style>{`
                @keyframes pwaSlideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
                }
                @keyframes pwaIconPop {
                    0%,100% { transform: scale(1); }
                    50%     { transform: scale(1.1); }
                }
                .rf-pwa-install-btn { transition: background 0.2s, box-shadow 0.2s, transform 0.15s; }
                .rf-pwa-install-btn:active { transform: scale(0.94); }
                .rf-pwa-dismiss-btn:hover { color: #fff !important; }
            `}</style>

            {/* ── Floating Install Banner ── */}
            <div style={{
                position: 'fixed',
                bottom: 92,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9998,
                width: 'calc(100% - 32px)',
                maxWidth: 420,
                animation: 'pwaSlideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(3,7,18,0.98) 0%, rgba(10,15,30,0.98) 100%)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: 20,
                    border: '1px solid rgba(99,102,241,0.25)',
                    padding: '12px 12px 12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Glow line */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 1,
                        background: 'linear-gradient(90deg, rgba(99,102,241,0.5), rgba(34,211,238,0.3), transparent)',
                    }} />

                    {/* App Icon */}
                    <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pwaIconPop 2.5s ease-in-out infinite',
                    }}>
                        <img
                            src="/icons/icon-192.png"
                            alt="RainFlow"
                            style={{ width: 38, height: 38, objectFit: 'contain' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                            Pasang RainFlow
                        </div>
                        <div style={{ fontSize: 11.5, color: 'rgba(148,163,184,0.85)', marginTop: 3, lineHeight: 1.4 }}>
                            Akses pipeline dari layar utama Anda
                        </div>
                    </div>

                    {/* Install Button */}
                    <button
                        className="rf-pwa-install-btn"
                        onClick={handleInstall}
                        disabled={installing}
                        style={{
                            background: installing
                                ? 'rgba(99,102,241,0.4)'
                                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            border: 'none',
                            borderRadius: 12,
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 12.5,
                            padding: '8px 16px',
                            cursor: installing ? 'wait' : 'pointer',
                            flexShrink: 0,
                            boxShadow: installing ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.01em',
                        }}
                    >
                        {installing ? '...' : '⬇ Pasang'}
                    </button>

                    {/* Dismiss Button */}
                    <button
                        className="rf-pwa-dismiss-btn"
                        onClick={handleDismiss}
                        aria-label="Tutup"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(100,116,139,0.8)',
                            fontSize: 18,
                            lineHeight: 1,
                            cursor: 'pointer',
                            padding: '4px 2px 4px 0',
                            flexShrink: 0,
                            transition: 'color 0.2s',
                        }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* ── Tutorial Modal (iOS / fallback) ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10000,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }} onClick={() => setShowTutorial(false)}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0a0f1e 0%, #111827 100%)',
                        borderRadius: 24,
                        padding: '24px',
                        maxWidth: 380,
                        width: '100%',
                        border: '1px solid rgba(99,102,241,0.25)',
                        color: '#fff',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: 64, height: 64, margin: '0 auto 16px',
                            background: 'rgba(99,102,241,0.1)', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: 36 }}>🌊</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
                            Cara Pasang RainFlow
                        </div>

                        <div style={{ color: '#94a3b8', fontSize: 13.5, marginBottom: 24, lineHeight: 1.6, textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16 }}>
                            {(/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) || (navigator.userAgent.toLowerCase().includes('mac') && 'ontouchend' in document)) ? (
                                <div>
                                    <b>🍎 Khusus Pengguna Apple (iOS/iPad):</b><br />
                                    1. Ketuk ikon <b>Bagikan (Share)</b> bergambar kotak dengan panah ke atas di bilah menu bawah Anda.<br />
                                    2. Geser menu ke atas, lalu temukan dan pilih <b>"Tambah ke Layar Utama" (Add to Home Screen)</b>.
                                </div>
                            ) : (
                                <div>
                                    <b>🖥️ Cara Install di Desktop/Android:</b><br />
                                    1. Klik ikon <b>⋮ (titik tiga)</b> di pojok kanan atas browser Chrome/Edge Anda.<br />
                                    2. Pilih menu <b>"Install app"</b> atau <b>"Tambahkan ke Layar Utama"</b>.<br />
                                    3. Klik <b>"Install"</b> pada dialog yang muncul.
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setShowTutorial(false);
                                setShowPrompt(false);
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 20px',
                                borderRadius: 14,
                                fontWeight: 800,
                                fontSize: 15,
                                cursor: 'pointer',
                                width: '100%',
                                boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                            }}
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
