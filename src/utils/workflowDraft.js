const DRAFT_KEY = 'rainflowWorkflowDraft'
const DB_NAME = 'rainflowWorkflowDraftDb'
const DB_VERSION = 1
const STORE_NAME = 'imageFiles'

const PIPELINE_STEPS = new Set(['dashboard', 'upload', 'generate', 'process', 'export', 'storage', 'settings', 'logs'])

function isBrowserStorageReady() {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function openDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            resolve(null)
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

function runStore(mode, callback) {
    return openDb().then(db => new Promise((resolve, reject) => {
        if (!db) {
            resolve(null)
            return
        }

        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const result = callback(store)
        tx.oncomplete = () => {
            db.close()
            resolve(result)
        }
        tx.onerror = () => {
            db.close()
            reject(tx.error)
        }
    }))
}

function normalizeStatus(status) {
    if (status === 'generating') return 'pending'
    return status || 'pending'
}

function sanitizeImage(img) {
    const preview = typeof img.preview === 'string' && !img.preview.startsWith('blob:')
        ? img.preview
        : ''

    return {
        id: img.id,
        name: img.name,
        preview,
        status: normalizeStatus(img.status),
        videoUrl: img.videoUrl || null,
        error: img.status === 'generating' ? null : (img.error || null),
        fromDrive: !!img.fromDrive,
        driveFileId: img.driveFileId || null,
        fileName: img.file?.name || img.name || 'image',
        fileType: img.file?.type || 'image/jpeg',
        lastModified: img.file?.lastModified || Date.now(),
        hasStoredFile: img.file instanceof Blob && img.file.size > 0,
    }
}

function shouldKeepDraft(draft) {
    const hasImages = Array.isArray(draft.images) && draft.images.length > 0
    const hasProgress = Object.values(draft.completedSteps || {}).some(Boolean)
    const isWorkingPage = draft.activeStep && draft.activeStep !== 'dashboard'
    return hasImages || hasProgress || isWorkingPage
}

export function readWorkflowDraftMeta() {
    if (!isBrowserStorageReady()) return null

    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch (e) {
        return null
    }
}

export async function persistWorkflowDraft({ activeStep, images, completedSteps, settings }) {
    if (!isBrowserStorageReady()) return

    const safeStep = PIPELINE_STEPS.has(activeStep) ? activeStep : 'dashboard'
    const draft = {
        version: 1,
        updatedAt: new Date().toISOString(),
        activeStep: safeStep,
        completedSteps: {
            upload: !!completedSteps?.upload,
            generate: !!completedSteps?.generate,
            process: !!completedSteps?.process,
            export: !!completedSteps?.export,
        },
        settings,
        images: (images || []).map(sanitizeImage),
    }

    if (!shouldKeepDraft(draft)) {
        await clearWorkflowDraft()
        return
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))

    await runStore('readwrite', (store) => {
        store.clear()
        ;(images || []).forEach((img) => {
            if (img.file instanceof Blob && img.file.size > 0) {
                store.put({
                    id: img.id,
                    blob: img.file,
                    name: img.file.name || img.name || 'image',
                    type: img.file.type || 'image/jpeg',
                    lastModified: img.file.lastModified || Date.now(),
                })
            }
        })
    }).catch(() => {})
}

export async function loadWorkflowDraft() {
    const meta = readWorkflowDraftMeta()
    if (!meta) return null

    const fileRecords = new Map()
    await runStore('readonly', (store) => {
        const req = store.getAll()
        req.onsuccess = () => {
            ;(req.result || []).forEach(record => fileRecords.set(record.id, record))
        }
    }).catch(() => {})

    const images = (meta.images || []).map((img) => {
        const record = fileRecords.get(img.id)
        if (record?.blob) {
            const file = new File(
                [record.blob],
                record.name || img.fileName || img.name || 'image',
                { type: record.type || img.fileType || 'image/jpeg', lastModified: record.lastModified || Date.now() }
            )
            return {
                ...img,
                file,
                preview: URL.createObjectURL(record.blob),
                status: normalizeStatus(img.status),
            }
        }

        return {
            ...img,
            file: null,
            preview: img.preview || '',
            status: normalizeStatus(img.status),
        }
    })

    return {
        ...meta,
        activeStep: PIPELINE_STEPS.has(meta.activeStep) ? meta.activeStep : 'dashboard',
        images,
    }
}

export async function clearWorkflowDraft() {
    if (isBrowserStorageReady()) {
        localStorage.removeItem(DRAFT_KEY)
    }
    await runStore('readwrite', (store) => store.clear()).catch(() => {})
}
