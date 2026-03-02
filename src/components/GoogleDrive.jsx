import React, { useState, useEffect, useCallback } from 'react'

const CLIENT_ID_KEY = 'rainflow_gdrive_client_id'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

export default function GoogleDrive({ onTokenChange }) {
    const [clientId, setClientId] = useState(() => localStorage.getItem(CLIENT_ID_KEY) || '')
    const [token, setToken] = useState(null)
    const [userInfo, setUserInfo] = useState(null)
    const [error, setError] = useState(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    // Load Google Identity Services script
    useEffect(() => {
        if (window.google?.accounts?.oauth2) { setScriptLoaded(true); return }
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.onload = () => setScriptLoaded(true)
        script.onerror = () => setError('Gagal memuat Google SDK')
        document.head.appendChild(script)
    }, [])

    const connect = useCallback(() => {
        if (!clientId.trim()) { setError('Masukkan Google Client ID terlebih dahulu'); return }
        if (!scriptLoaded) { setError('Google SDK belum siap'); return }
        setError(null)

        localStorage.setItem(CLIENT_ID_KEY, clientId.trim())

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId.trim(),
            scope: SCOPES,
            callback: async (response) => {
                if (response.error) { setError(`OAuth error: ${response.error}`); return }

                const accessToken = response.access_token
                setToken(accessToken)
                onTokenChange(accessToken)

                // Get user info
                try {
                    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    })
                    const info = await res.json()
                    setUserInfo(info)
                } catch { /* ignore */ }
            }
        })
        tokenClient.requestAccessToken()
    }, [clientId, scriptLoaded, onTokenChange])

    const disconnect = useCallback(() => {
        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token)
        }
        setToken(null)
        setUserInfo(null)
        onTokenChange(null)
    }, [token, onTokenChange])

    if (token) {
        return (
            <div className="gdrive-connected">
                <span className="gdrive-icon">📂</span>
                <div className="gdrive-info">
                    <span className="gdrive-name">Google Drive</span>
                    <span className="gdrive-email">{userInfo?.email || 'Connected'}</span>
                </div>
                <button className="btn btn--sm btn--danger" onClick={disconnect} id="btn-gdrive-disconnect">
                    Disconnect
                </button>
            </div>
        )
    }

    return (
        <div className="gdrive-connect">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    className="settings-field__input"
                    style={{ flex: 1, minWidth: 250, padding: '6px 10px', fontSize: 12 }}
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Google OAuth Client ID (.apps.googleusercontent.com)"
                    id="input-gdrive-client-id"
                />
                <button className="btn btn--sm btn--outline" onClick={connect} id="btn-gdrive-connect">
                    📂 Connect Drive
                </button>
            </div>
            {error && <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 6 }}>⚠️ {error}</p>}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Client ID bisa dibuat gratis di{' '}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)' }}>Google Cloud Console</a>.
            </p>
        </div>
    )
}
