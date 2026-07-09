import { useState, useEffect } from 'preact/hooks'
import { FiPlus, FiTrash2, FiLogOut, FiFolder } from 'react-icons/fi'
import { listFiles, createFile, deleteFile } from '../lib/json-drop-store.js'

export function FilePicker({ db, connection, onOpenFile, onDisconnect }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const list = await listFiles(db)
      setFiles(list)
    } catch (e) {
      setError(e.message || 'Could not load files from the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [db])

  async function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    setError('')
    try {
      const file = await createFile(db, name)
      setNewName('')
      setShowNew(false)
      onOpenFile(file)
    } catch (e) {
      setError(e.message || 'Could not create file.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteFile(db, file.path, file.version)
      await refresh()
    } catch (e) {
      setError(e.message || 'Could not delete file. It may have been modified.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="file-picker">
      <header class="app-header">
        <h1>Shared Expenses</h1>
        <div class="header-actions">
          <button
            type="button"
            class="icon-button secondary"
            onClick={onDisconnect}
            aria-label="Disconnect"
            title="Disconnect"
          >
            <FiLogOut />
          </button>
        </div>
      </header>

      <section class="panel">
        <div class="panel-header">
          <h2>Your files</h2>
          {!showNew && (
            <button
              type="button"
              class="icon-button"
              onClick={() => setShowNew(true)}
              aria-label="New file"
              title="New file"
            >
              <FiPlus />
            </button>
          )}
        </div>

        <p class="hint connection-info">
          <FiFolder /> {connection.baseUrl} · project {connection.projectId}
        </p>

        {showNew && (
          <form class="inline-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="File name (e.g. Spain Trip 2026)"
              value={newName}
              onInput={(e) => setNewName(e.currentTarget.value)}
              autoFocus
            />
            <button type="submit" class="icon-button" disabled={busy} aria-label="Create" title="Create">
              <FiPlus />
            </button>
            <button
              type="button"
              class="icon-button secondary"
              onClick={() => { setShowNew(false); setNewName('') }}
              aria-label="Cancel"
              title="Cancel"
            >
              ✕
            </button>
          </form>
        )}

        {error && <div class="global-error">{error}</div>}

        {loading ? (
          <p class="empty">Loading…</p>
        ) : files.length === 0 ? (
          <p class="empty">No files yet. Create one to get started.</p>
        ) : (
          <ul class="file-list">
            {files.map((file) => (
              <li key={file.id} class="file-item">
                <button
                  type="button"
                  class="file-open"
                  onClick={() => onOpenFile(file)}
                >
                  <span class="file-name">{file.name}</span>
                  <span class="file-meta">
                    Updated {new Date(file.updatedAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  type="button"
                  class="icon-button danger"
                  onClick={() => handleDelete(file)}
                  disabled={busy}
                  aria-label="Delete file"
                  title="Delete file"
                >
                  <FiTrash2 />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}