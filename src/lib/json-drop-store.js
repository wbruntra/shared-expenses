import { useState, useEffect, useRef } from 'preact/hooks'
import { JsonDrop, JsonDropError } from '@wbruntra/json-drop'
import { createEmptyData } from './data.js'

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

function normalizeContent(content) {
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

export function useJsonDropFile(db, filePath) {
  const [data, setData] = useState(emptyFileData)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const versionRef = useRef(null)
  const dataRef = useRef(data)
  const saveTimer = useRef(null)
  const skipNextSave = useRef(false)

  dataRef.current = data

  useEffect(() => {
    if (!db || !filePath) {
      versionRef.current = null
      setData(emptyFileData())
      setStatus('idle')
      setError(null)
      return
    }
    let cancelled = false
    setStatus('loading')
    setError(null)
    setErrorCode(null)
    db.doc(filePath).get()
      .then((doc) => {
        if (cancelled) return
        versionRef.current = doc.version
        skipNextSave.current = true
        setData(normalizeContent(doc.content))
        setStatus('idle')
      })
      .catch((e) => {
        if (cancelled) return
        setStatus('error')
        setError(msgFor(e))
        setErrorCode(e instanceof JsonDropError ? e.code : null)
      })
    return () => { cancelled = true }
  }, [db, filePath])

  useEffect(() => {
    if (!db || !filePath || status === 'loading' || status === 'conflict' || !versionRef.current) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setStatus('saving')
      try {
        const result = await db.doc(filePath).set(dataRef.current, { ifMatch: versionRef.current })
        versionRef.current = result.version
        setStatus('saved')
      } catch (e) {
        if (e instanceof JsonDropError && e.code === 'conflict') {
          setStatus('conflict')
        } else {
          setStatus('error')
          setError(msgFor(e))
          setErrorCode(e instanceof JsonDropError ? e.code : null)
        }
      }
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [data, db, filePath])

  async function reload() {
    const doc = await db.doc(filePath).get()
    versionRef.current = doc.version
    skipNextSave.current = true
    setData(normalizeContent(doc.content))
    setStatus('idle')
    setError(null)
  }

  async function forceOverwrite() {
    setStatus('saving')
    setError(null)
    try {
      const result = await db.doc(filePath).set(dataRef.current)
      versionRef.current = result.version
      setStatus('saved')
    } catch (e) {
      setStatus('error')
      setError(msgFor(e))
    }
  }

  return { data, setData, status, error, errorCode, reload, forceOverwrite }
}