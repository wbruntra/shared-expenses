import { useState, useRef, useEffect } from 'preact/hooks'
import { FiDownload, FiUpload, FiArrowLeft, FiAlertCircle } from 'react-icons/fi'
import { Link, useLocation } from 'wouter'
import { exportToFile, importFromFile, migrateOldData } from './lib/store.js'
import { PeopleManager } from './components/PeopleManager.jsx'
import { ExpenseList } from './components/ExpenseList.jsx'
import { PaymentList } from './components/PaymentList.jsx'
import { BalanceSheet } from './components/BalanceSheet.jsx'
import { ConnectScreen } from './components/ConnectScreen.jsx'
import { FilePicker } from './components/FilePicker.jsx'
import {
  getConnection,
  setConnection as persistConnection,
  clearConnectionStorage,
  getActiveFile,
  setActiveFileStorage,
  clearActiveFileStorage,
  createJsonDrop,
  useJsonDropFile,
} from './lib/json-drop-store.js'
import './app.css'

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'payments', label: 'Payments' },
  { id: 'balances', label: 'Balances' },
]

const DEFAULT_TAB = 'expenses'

export function App() {
  const [connection, setConnectionState] = useState(getConnection)
  const [db, setDb] = useState(() => (connection ? createJsonDrop(connection) : null))
  const [activeFile, setActiveFileState] = useState(getActiveFile)
  const [connectError, setConnectError] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)

  const file = useJsonDropFile(db, activeFile, setActiveFileState)

  const [location, setLocation] = useLocation()
  const fileInputRef = useRef(null)

  const activeTab = TABS.some((tab) => `/${tab.id}` === location)
    ? location.slice(1)
    : DEFAULT_TAB

  useEffect(() => {
    migrateOldData()
  }, [])

  useEffect(() => {
    if (activeFile) {
      setActiveFileStorage(activeFile)
    } else {
      clearActiveFileStorage()
    }
  }, [activeFile])

  useEffect(() => {
    if (!TABS.some((tab) => `/${tab.id}` === location)) {
      setLocation(`/${DEFAULT_TAB}`, { replace: true })
    }
  }, [location, setLocation])

  function handleConnect(config) {
    setConnectError('')
    if (!config.baseUrl || !config.projectId) {
      setConnectError('Server URL and project ID are required.')
      return
    }
    persistConnection(config)
    setConnectionState(config)
    setDb(createJsonDrop(config))
    setShowConnect(false)
  }

  function handleDisconnect() {
    clearConnectionStorage()
    setConnectionState(null)
    setDb(null)
    setActiveFileState(null)
  }

  function handleOpenFile(openedFile) {
    setActiveFileState(openedFile)
  }

  function handleCloseFile() {
    setActiveFileState(null)
    setLocation(`/${DEFAULT_TAB}`, { replace: true })
  }

  function handleExport() {
    exportToFile(file.data)
  }

  async function handleImport(e) {
    const input = e.currentTarget
    const clickedFile = input.files?.[0]
    if (!clickedFile) return
    try {
      const imported = await importFromFile(clickedFile)
      if (
        imported.people.length === 0 &&
        imported.expenses.length === 0 &&
        imported.payments.length === 0
      ) {
        return
      }
      if (window.confirm('Replace all current data with the imported file?')) {
        file.setData({ ...file.data, ...imported })
      }
    } catch {
      // ignore invalid file
    } finally {
      input.value = ''
    }
  }

  if (showConnect) {
    return (
      <div class="app">
        <ConnectScreen
          onConnect={handleConnect}
          onCancel={() => setShowConnect(false)}
          error={connectError}
        />
      </div>
    )
  }

  if (!activeFile) {
    return (
      <div class="app">
        <FilePicker
          db={db}
          connection={connection}
          onOpenFile={handleOpenFile}
          onDisconnect={handleDisconnect}
          onConnectClick={() => setShowConnect(true)}
        />
      </div>
    )
  }

  const { data, setData, status, error, errorCode, reload, forceOverwrite } = file

  return (
    <div class="app">
      <header class="app-header">
        <div class="header-title">
          <button
            type="button"
            class="icon-button secondary"
            onClick={handleCloseFile}
            aria-label="Back to files"
            title="Back to files"
          >
            <FiArrowLeft />
          </button>
          <h1>{data.name}</h1>
          <button
            type="button"
            class="group-pill-btn"
            onClick={() => setShowGroupModal(true)}
            title="Manage group members"
          >
            👥 {data.people?.length || 0} {data.people?.length === 1 ? 'person' : 'people'}
          </button>
        </div>
        <div class="header-actions">
          <SaveStatus status={status} />
          <button
            type="button"
            class="icon-button secondary"
            onClick={handleExport}
            aria-label="Export JSON"
            title="Export JSON"
          >
            <FiDownload />
          </button>
          <button
            type="button"
            class="icon-button secondary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import JSON"
            title="Import JSON"
          >
            <FiUpload />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            class="hidden"
            onChange={handleImport}
          />
        </div>
      </header>

      {status === 'conflict' && (
        <div class="conflict-banner">
          <span class="conflict-text">
            <FiAlertCircle /> Another device updated this file.
          </span>
          <div class="conflict-actions">
            <button type="button" class="secondary" onClick={reload}>
              Reload their changes
            </button>
            <button type="button" onClick={forceOverwrite}>
              Overwrite with mine
            </button>
          </div>
        </div>
      )}

      {status === 'error' && error && (
        errorCode === 'not_found' ? (
          <div class="conflict-banner">
            <span class="conflict-text">
              <FiAlertCircle /> This file no longer exists on the server.
            </span>
            <div class="conflict-actions">
              <button type="button" onClick={handleCloseFile}>
                Back to files
              </button>
            </div>
          </div>
        ) : (
          <div class="global-error">{error}</div>
        )
      )}

      {status === 'loading' ? (
        <p class="empty">Loading file…</p>
      ) : (
        <>
          <nav class="tabs">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={`/${tab.id}`}
                class={activeTab === tab.id ? 'active' : ''}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <main class="app-main">
            {activeTab === 'expenses' && (
              <ExpenseList data={data} onChange={setData} />
            )}
            {activeTab === 'payments' && (
              <PaymentList data={data} onChange={setData} />
            )}
            {activeTab === 'balances' && <BalanceSheet data={data} />}
          </main>
        </>
      )}

      {showGroupModal && (
        <div class="dialog-modal">
          <div class="dialog-backdrop" onClick={() => setShowGroupModal(false)} />
          <div class="dialog-content">
            <header class="dialog-header">
              <h2>Group Members</h2>
              <button
                type="button"
                class="icon-button secondary"
                onClick={() => setShowGroupModal(false)}
                aria-label="Close"
                title="Close"
                style={{ border: 'none', padding: '4px', fontSize: '18px', background: 'transparent' }}
              >
                ✕
              </button>
            </header>
            <div class="dialog-body">
              <PeopleManager data={data} onChange={setData} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SaveStatus({ status }) {
  if (status === 'saving') return <span class="save-status saving">Saving to cloud…</span>
  if (status === 'syncing') return <span class="save-status saving">Syncing…</span>
  if (status === 'saved') return <span class="save-status saved">Synced</span>
  if (status === 'offline') return <span class="save-status offline">Offline (Saved locally)</span>
  if (status === 'idle') return <span class="save-status saved-local">Saved locally</span>
  return null
}