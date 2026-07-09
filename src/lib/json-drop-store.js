import { useState, useEffect, useRef } from 'preact/hooks'
import { JsonDrop, JsonDropError } from '@wbruntra/json-drop'
import { createEmptyData } from './data.js'
import { getLocalFileData, saveLocalFileData, updateFileMetadata } from './store.js'

const CONNECTION_KEY = 'json-drop-connection'
const ACTIVE_FILE_KEY = 'json-drop-active-file'
const FILE_PREFIX = 'shared-expenses'

export function getConnection() {
  try {
    const raw = localStorage.getItem(CONNECTION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setConnection(config) {
  localStorage.setItem(CONNECTION_KEY, JSON.stringify(config))
}

export function clearConnectionStorage() {
  localStorage.removeItem(CONNECTION_KEY)
  localStorage.removeItem(ACTIVE_FILE_KEY)
}

export function getActiveFile() {
  try {
    const raw = localStorage.getItem(ACTIVE_FILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveFileStorage(file) {
  localStorage.setItem(ACTIVE_FILE_KEY, JSON.stringify(file))
}

export function clearActiveFileStorage() {
  localStorage.removeItem(ACTIVE_FILE_KEY)
}

export function createJsonDrop(config) {
  return new JsonDrop({
    baseUrl: config.baseUrl,
    token: config.token || undefined,
    project: config.projectId || undefined,
  })
}

export function normalizeContent(content) {
  return {
    name: content?.name || 'Untitled',
    people: Array.isArray(content?.people) ? content.people : [],
    expenses: Array.isArray(content?.expenses) ? content.expenses : [],
    payments: Array.isArray(content?.payments) ? content.payments : [],
  }
}

function emptyFileData() {
  return { name: 'Untitled', people: [], expenses: [], payments: [] }
}

function msgFor(e) {
  if (!(e instanceof JsonDropError)) return e.message || 'Network error'
  switch (e.code) {
    case 'unauthenticated': return 'Authentication required — check your token.'
    case 'forbidden': return 'You do not have access to this file.'
    case 'not_found': return 'File not found on the server.'
    case 'conflict': return 'This file was modified by another device.'
    case 'storage_limit': return 'Storage limit reached for this project.'
    case 'rate_limited': return 'Too many requests — please wait a moment.'
    case 'bad_request': return 'The server rejected the request.'
    default: return e.message || 'Server error.'
  }
}

export async function listFiles(db) {
  const result = await db.collection(FILE_PREFIX).list({ prefix: `${FILE_PREFIX}/` })
  return result.docs.map((doc) => ({
    id: doc.id,
    path: doc.path,
    name: doc.content?.name || 'Untitled',
    version: doc.version,
    updatedAt: doc.updated_at,
  }))
}

export async function createFile(db, name) {
  const content = { name, ...createEmptyData() }
  const result = await db.collection(FILE_PREFIX).add(content)
  return {
    id: result.id,
    path: result.path,
    name,
    version: result.version,
  }
}

export async function deleteFile(db, path, version) {
  await db.doc(path).delete({ ifMatch: version })
}

export function useJsonDropFile(db, activeFile, setActiveFileState) {
  const [data, setData] = useState(() => (activeFile ? getLocalFileData(activeFile.id) : emptyFileData()))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const saveTimer = useRef(null)
  const isInitialLoad = useRef(true)
  const prevFileId = useRef(activeFile?.id)

  useEffect(() => {
    if (!activeFile) {
      setData(emptyFileData())
      setStatus('idle')
      setError(null)
      setErrorCode(null)
      prevFileId.current = null
      return
    }

    if (prevFileId.current !== activeFile.id) {
      prevFileId.current = activeFile.id
      isInitialLoad.current = true
      const localData = getLocalFileData(activeFile.id)
      setData(localData)
      setStatus('idle')
      setError(null)
      setErrorCode(null)
    }

    if (activeFile.type !== 'synced' || !db) {
      return
    }

    let cancelled = false
    setStatus('syncing')

    db.doc(activeFile.path).get()
      .then((doc) => {
        if (cancelled) return

        const remoteVersion = doc.version
        const localVersion = activeFile.version

        if (remoteVersion !== localVersion) {
          if (!activeFile.hasUnsavedChanges) {
            const remoteContent = normalizeContent(doc.content)
            setData(remoteContent)
            saveLocalFileData(activeFile.id, remoteContent)

            const updatedMeta = {
              ...activeFile,
              version: remoteVersion,
              updatedAt: doc.updated_at || new Date().toISOString(),
            }
            updateFileMetadata(activeFile.id, updatedMeta)
            if (setActiveFileState) {
              setActiveFileState(updatedMeta)
            }
            setStatus('idle')
          } else {
            setStatus('conflict')
          }
        } else {
          if (activeFile.hasUnsavedChanges) {
            triggerCloudSave(data, doc.version)
          } else {
            setStatus('idle')
          }
        }
      })
      .catch((e) => {
        if (cancelled) return
        setStatus('offline')
        setError(msgFor(e))
        setErrorCode(e instanceof JsonDropError ? e.code : null)
      })

    return () => {
      cancelled = true
    }
  }, [db, activeFile?.id])

  useEffect(() => {
    if (!activeFile) return

    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    saveLocalFileData(activeFile.id, data)

    const updatedMeta = {
      ...activeFile,
      hasUnsavedChanges: activeFile.type === 'synced',
      updatedAt: new Date().toISOString(),
    }
    updateFileMetadata(activeFile.id, updatedMeta)
    if (setActiveFileState) {
      setActiveFileState(updatedMeta)
    }

    if (activeFile.type !== 'synced' || !db || status === 'conflict') {
      return
    }

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setStatus('saving')
      try {
        const result = await db.doc(activeFile.path).set(data, { ifMatch: activeFile.version })
        const savedMeta = {
          ...activeFile,
          hasUnsavedChanges: false,
          version: result.version,
          updatedAt: new Date().toISOString(),
        }
        updateFileMetadata(activeFile.id, savedMeta)
        if (setActiveFileState) {
          setActiveFileState(savedMeta)
        }
        setStatus('saved')
      } catch (e) {
        if (e instanceof JsonDropError && e.code === 'conflict') {
          setStatus('conflict')
        } else {
          setStatus('offline')
          setError(msgFor(e))
          setErrorCode(e instanceof JsonDropError ? e.code : null)
        }
      }
    }, 1000)

    return () => clearTimeout(saveTimer.current)
  }, [data])

  async function triggerCloudSave(currentData, remoteVersion) {
    setStatus('saving')
    try {
      const result = await db.doc(activeFile.path).set(currentData, { ifMatch: remoteVersion })
      const savedMeta = {
        ...activeFile,
        hasUnsavedChanges: false,
        version: result.version,
        updatedAt: new Date().toISOString(),
      }
      updateFileMetadata(activeFile.id, savedMeta)
      if (setActiveFileState) {
        setActiveFileState(savedMeta)
      }
      setStatus('saved')
    } catch (e) {
      if (e instanceof JsonDropError && e.code === 'conflict') {
        setStatus('conflict')
      } else {
        setStatus('offline')
        setError(msgFor(e))
        setErrorCode(e instanceof JsonDropError ? e.code : null)
      }
    }
  }

  async function reload() {
    if (!activeFile || !db) return
    setStatus('loading')
    try {
      const doc = await db.doc(activeFile.path).get()
      const remoteContent = normalizeContent(doc.content)
      setData(remoteContent)
      saveLocalFileData(activeFile.id, remoteContent)

      const updatedMeta = {
        ...activeFile,
        hasUnsavedChanges: false,
        version: doc.version,
        updatedAt: doc.updated_at || new Date().toISOString(),
      }
      updateFileMetadata(activeFile.id, updatedMeta)
      if (setActiveFileState) {
        setActiveFileState(updatedMeta)
      }
      setStatus('idle')
      setError(null)
    } catch (e) {
      setStatus('error')
      setError(msgFor(e))
    }
  }

  async function forceOverwrite() {
    if (!activeFile || !db) return
    setStatus('saving')
    setError(null)
    try {
      const result = await db.doc(activeFile.path).set(data)
      const updatedMeta = {
        ...activeFile,
        hasUnsavedChanges: false,
        version: result.version,
        updatedAt: new Date().toISOString(),
      }
      updateFileMetadata(activeFile.id, updatedMeta)
      if (setActiveFileState) {
        setActiveFileState(updatedMeta)
      }
      setStatus('saved')
    } catch (e) {
      setStatus('error')
      setError(msgFor(e))
    }
  }

  return { data, setData, status, error, errorCode, reload, forceOverwrite }
}