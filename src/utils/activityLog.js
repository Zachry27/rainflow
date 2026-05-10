const LOG_KEY = 'rainflowActivityLogs'
const MAX_LOG_ITEMS = 500

export function readActivityLogs() {
    try {
        const raw = localStorage.getItem(LOG_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch (e) {
        return []
    }
}

export function pushActivityLog(type, message, meta = {}) {
    try {
        const logs = readActivityLogs()
        logs.unshift({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            at: new Date().toISOString(),
            type,
            message,
            meta,
        })
        localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOG_ITEMS)))
    } catch (e) {}
}

export function clearActivityLogs() {
    try {
        localStorage.removeItem(LOG_KEY)
    } catch (e) {}
}
