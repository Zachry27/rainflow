import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
const CLIENT_ID_KEY = 'rainflow_gdrive_client_id'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

export default function GoogleDrive({ onTokenChange }) {
    const [clientId, setClientId] = useState(() => localStorage.getItem(CLIENT_ID_KEY) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
    const [token, setToken] = useState(null)
    const [userInfo, setUserInfo] = useState(null)
    const [error, setError] = useState(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    const { token: authJWT } = useAuth()

    // Load Google Identity Services script
    useEffect(() => {
        if (window.google?.accounts?.oauth2) { setScriptLoaded(true); return }
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.onload = () => setScriptLoaded(true)
        script.onerror = () => setError('Gagal memuat Google SDK')
        document.head.appendChild(script)
    }, [])

    // Load session from backend
    useEffect(() => {
        if (!authJWT) return;
        const fetchSession = async () => {
            try {
                const res = await fetch('/v1/auth/gdrive', {
                    headers: { 'Authorization': `Bearer ${authJWT}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.client_id) setClientId(data.client_id)
                    if (data.access_token) {
                        setToken(data.access_token)
                        onTokenChange(data.access_token)
                        fetchUserInfo(data.access_token)
                    }
                }
            } catch (e) {
                console.error("Failed to load drive session", e)
            }
        }
        fetchSession()
    }, [authJWT, onTokenChange])

    const fetchUserInfo = async (accessToken) => {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            const info = await res.json()
            setUserInfo(info)
        } catch { /* ignore */ }
    }

    const saveSessionToBackend = async (cid, atoken) => {
        if (!authJWT) return;
        await fetch('/v1/auth/gdrive', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authJWT}` 
            },
            body: JSON.stringify({ client_id: cid, access_token: atoken })
        })
    }

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
                saveSessionToBackend(clientId.trim(), accessToken)
                fetchUserInfo(accessToken)
            }
        })
        tokenClient.requestAccessToken()
    }, [clientId, scriptLoaded, onTokenChange, authJWT])

    const disconnect = useCallback(() => {
        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token)
        }
        setToken(null)
        setUserInfo(null)
        onTokenChange(null)
        saveSessionToBackend(clientId.trim(), null)
    }, [token, onTokenChange, clientId, authJWT])

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
