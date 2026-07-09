import { useState, useEffect } from 'preact/hooks'
import {
  FiPlus,
  FiTrash2,
  FiLogOut,
  FiHardDrive,
  FiCloud,
  FiDownload,
  FiUpload,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi'
import { listFiles, createFile, deleteFile, normalizeContent } from '../lib/json-drop-store.js'
import {
  getLocalFiles,
  saveLocalFiles,
  getLocalFileData,
  saveLocalFileData,
  deleteLocalFile,
  updateFileMetadata
} from '../lib/store.js'

export function FilePicker({ db, connection, onOpenFile, onDisconnect, onConnectClick }) {
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
      const localList = getLocalFiles()
      let merged = [...localList]

      if (db) {
        try {
          const remoteList = await listFiles(db)
          const localPaths = new Set(localList.filter(f => f.path).map(f => f.path))

          // Add remote files that aren't local yet
          for (const r of remoteList) {
            if (!localPaths.has(r.path)) {
              merged.push({
                id: `cloud-${r.id}`,
                name: r.name,
                type: 'cloud-only',
                path: r.path,
                version: r.version,
                updatedAt: r.updatedAt,
              })
            }
          }

          // Mark local files that are synced but missing from remote list
          const remotePaths = new Set(remoteList.map(r => r.path))
          merged = merged.map(f => {
            if (f.type === 'synced' && !remotePaths.has(f.path)) {
              return { ...f, serverDeleted: true }
            }
            return f
          })
        } catch (e) {
          setError('Could not fetch cloud files. Working in offline mode.')
        }
      }

      // Sort by updatedAt descending
      merged.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      setFiles(merged)
    } catch (e) {
      setError(e.message || 'Could not load files.')
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
      if (db) {
        const remoteFile = await createFile(db, name)
        saveLocalFileData(remoteFile.id, { name, people: [], expenses: [], payments: [] })
        const localFile = {
          id: remoteFile.id,
          name,
          type: 'synced',
          path: remoteFile.path,
          version: remoteFile.version,
          updatedAt: new Date().toISOString(),
          hasUnsavedChanges: false
        }
        const currentLocals = getLocalFiles()
        saveLocalFiles([localFile, ...currentLocals])
        setNewName('')
        setShowNew(false)
        onOpenFile(localFile)
      } else {
        const fileId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        saveLocalFileData(fileId, { name, people: [], expenses: [], payments: [] })
        const localFile = {
          id: fileId,
          name,
          type: 'local',
          updatedAt: new Date().toISOString()
        }
        const currentLocals = getLocalFiles()
        saveLocalFiles([localFile, ...currentLocals])
        setNewName('')
        setShowNew(false)
        onOpenFile(localFile)
      }
    } catch (e) {
      setError(e.message || 'Could not create file.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(file) {
    if (file.type === 'cloud-only') {
      if (!db || busy) return
      setBusy(true)
      setError('')
      try {
        const doc = await db.doc(file.path).get()
        const content = normalizeContent(doc.content)
        
        saveLocalFileData(file.id, content)
        
        const localFile = {
          id: file.id,
          name: file.name,
          type: 'synced',
          path: file.path,
          version: doc.version,
          updatedAt: doc.updated_at || new Date().toISOString(),
          hasUnsavedChanges: false
        }
        const currentLocals = getLocalFiles()
        saveLocalFiles([localFile, ...currentLocals])
        
        onOpenFile(localFile)
      } catch (e) {
        setError(e.message || 'Could not download file from cloud.')
      } finally {
        setBusy(false)
      }
    } else {
      onOpenFile(file)
    }
  }

  async function handleSyncToCloud(file) {
    if (!db || busy) return
    setBusy(true)
    setError('')
    try {
      const localData = getLocalFileData(file.id)
      const content = { ...localData, name: file.name }
      const result = await db.collection('shared-expenses').add(content)
      
      const updatedMeta = {
        ...file,
        type: 'synced',
        path: result.path,
        version: result.version,
        updatedAt: new Date().toISOString(),
        hasUnsavedChanges: false
      }
      updateFileMetadata(file.id, updatedMeta)
      await refresh()
    } catch (e) {
      setError(e.message || 'Could not sync file to cloud.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.name}"?`)) return
    setBusy(true)
    setError('')
    try {
      if (file.type === 'local') {
        deleteLocalFile(file.id)
      } else if (file.type === 'cloud-only') {
        if (db) {
          await deleteFile(db, file.path, file.version)
        }
      } else if (file.type === 'synced') {
        const deleteRemote = db && window.confirm(
          `Do you want to delete "${file.name}" from the cloud as well?\n\nClick 'OK' to delete from both cloud and device.\nClick 'Cancel' to delete from this device only.`
        )
        if (deleteRemote && db) {
          await deleteFile(db, file.path, file.version)
        }
        deleteLocalFile(file.id)
      }
      await refresh()
    } catch (e) {
      setError(e.message || 'Could not delete file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="file-picker">
      <header class="app-header">
        <h1>Shared Expenses</h1>
        <div class="header-actions">
          {connection && (
            <button
              type="button"
              class="icon-button secondary"
              onClick={onDisconnect}
              aria-label="Disconnect cloud"
              title="Disconnect cloud"
            >
              <FiLogOut />
            </button>
          )}
        </div>
      </header>

      <section class="panel">
        <div class="panel-header">
          <h2>Projects</h2>
          {!showNew && (
            <button
              type="button"
              class="icon-button"
              onClick={() => setShowNew(true)}
              aria-label="New project"
              title="New project"
            >
              <FiPlus />
            </button>
          )}
        </div>

        {/* Cloud backup status bar */}
        {connection ? (
          <div class="connection-info">
            <FiCloud class="text-success" />
            <span style={{ flex: 1 }}>
              Cloud backup: <strong>Connected</strong> ({connection.baseUrl})
            </span>
            <button
              type="button"
              class="icon-button secondary mini-refresh-btn"
              onClick={refresh}
              disabled={loading || busy}
              aria-label="Refresh files"
              title="Refresh files"
            >
              <FiRefreshCw class={loading ? "spin" : ""} />
            </button>
          </div>
        ) : (
          <div class="connection-info local-only-banner">
            <FiHardDrive />
            <span style={{ flex: 1 }}>
              Using local storage. Connect cloud backup to sync between devices.
            </span>
            <button
              type="button"
              class="button secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={onConnectClick}
            >
              Connect Cloud
            </button>
          </div>
        )}

        {showNew && (
          <form class="inline-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Project name (e.g. Spain Trip 2026)"
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
          <p class="empty">Loading projects…</p>
        ) : files.length === 0 ? (
          <p class="empty">No projects yet. Create one to get started.</p>
        ) : (
          <ul class="file-list">
            {files.map((file) => {
              const isLocal = file.type === 'local'
              const isSynced = file.type === 'synced'
              const isCloudOnly = file.type === 'cloud-only'

              return (
                <li key={file.id} class="file-item">
                  <button
                    type="button"
                    class="file-open"
                    onClick={() => handleOpen(file)}
                    disabled={busy}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {isLocal && <FiHardDrive class="file-icon local-icon" title="Stored on this device" />}
                      {isSynced && <FiCloud class="file-icon synced-icon" title="Synced to cloud" />}
                      {isCloudOnly && <FiCloud class="file-icon cloud-only-icon" title="Cloud only (Click to download)" />}
                      
                      <span class="file-name">{file.name}</span>
                      
                      {isSynced && file.hasUnsavedChanges && (
                        <span class="badge warning" title="Changes saved locally, pending sync">
                          Pending sync
                        </span>
                      )}
                      {file.serverDeleted && (
                        <span class="badge danger" title="Deleted from the cloud server">
                          Local copy only
                        </span>
                      )}
                    </div>
                    <span class="file-meta">
                      {isCloudOnly ? "Cloud Project · " : ""}
                      Updated {new Date(file.updatedAt).toLocaleDateString()} at {new Date(file.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>

                  <div class="file-actions" style={{ display: 'flex', gap: '4px', paddingRight: '8px' }}>
                    {isLocal && db && (
                      <button
                        type="button"
                        class="icon-button secondary"
                        onClick={() => handleSyncToCloud(file)}
                        disabled={busy}
                        aria-label="Upload to cloud"
                        title="Upload to cloud"
                      >
                        <FiUpload />
                      </button>
                    )}
                    {isCloudOnly && (
                      <button
                        type="button"
                        class="icon-button secondary"
                        onClick={() => handleOpen(file)}
                        disabled={busy}
                        aria-label="Download project"
                        title="Download project"
                      >
                        <FiDownload />
                      </button>
                    )}
                    <button
                      type="button"
                      class="icon-button danger"
                      onClick={() => handleDelete(file)}
                      disabled={busy}
                      aria-label="Delete project"
                      title="Delete project"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}