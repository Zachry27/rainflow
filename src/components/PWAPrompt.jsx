import React, { useState, useEffect } from 'react';

export default function PWAPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        // Detect if already installed / standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) return;

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPopup(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPopup(false);
        }
        setDeferredPrompt(null);
    };

    if (!showPopup) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--bg-card, #222)',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            border: '1px solid var(--border-color, #333)',
            color: 'white',
            animation: 'slideUp 0.5s ease'
        }}>
            <div style={{ fontSize: '24px' }}>🌊</div>
            <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Install RainFlow</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#aaa', marginTop: '4px' }}>Akses lebih cepat & mudah!</p>
            </div>
            <button 
                onClick={handleInstallClick}
                style={{ 
                    padding: '8px 16px', 
                    background: 'var(--accent, #007bff)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginLeft: '8px'
                }}
            >
                Install
            </button>
            <button 
                onClick={() => setShowPopup(false)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px'
                }}
            >
                ×
            </button>
            <style>
                {`
                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
}
