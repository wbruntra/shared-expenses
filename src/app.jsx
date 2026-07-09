import { useState, useRef, useEffect } from 'preact/hooks'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { Link, useLocation } from 'wouter'
import { loadData, saveData, exportToFile, importFromFile } from './lib/store.js'
import { PeopleManager } from './components/PeopleManager.jsx'
import { ExpenseList } from './components/ExpenseList.jsx'
import { PaymentList } from './components/PaymentList.jsx'
import { BalanceSheet } from './components/BalanceSheet.jsx'
import './app.css'

const TABS = [
  { id: 'people', label: 'People' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'payments', label: 'Payments' },
  { id: 'balances', label: 'Balances' },
]

const DEFAULT_TAB = 'people'

export function App() {
  const [data, setData] = useState(loadData)
  const [importError, setImportError] = useState('')
  const [location, setLocation] = useLocation()
  const fileInputRef = useRef(null)

  const activeTab = TABS.some((tab) => `/${tab.id}` === location)
    ? location.slice(1)
    : DEFAULT_TAB

  useEffect(() => {
    if (!TABS.some((tab) => `/${tab.id}` === location)) {
      setLocation(`/${DEFAULT_TAB}`, { replace: true })
    }
  }, [location, setLocation])

  useEffect(() => {
    saveData(data)
  }, [data])

  function handleExport() {
    exportToFile(data)
  }

  async function handleImport(e) {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const imported = await importFromFile(file)
      if (
        imported.people.length === 0 &&
        imported.expenses.length === 0 &&
        imported.payments.length === 0
      ) {
        setImportError('The selected file appears to be empty or invalid.')
        return
      }
      if (window.confirm('Replace all current data with the imported file?')) {
        setData(imported)
      }
    } catch {
      setImportError('Could not read the file. Make sure it is valid JSON.')
    } finally {
      e.currentTarget.value = ''
    }
  }

  return (
    <div class="app">
      <header class="app-header">
        <h1>Shared Expenses</h1>
        <div class="header-actions">
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

      {importError && <div class="global-error">{importError}</div>}

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
        {activeTab === 'people' && (
          <PeopleManager data={data} onChange={setData} />
        )}
        {activeTab === 'expenses' && (
          <ExpenseList data={data} onChange={setData} />
        )}
        {activeTab === 'payments' && (
          <PaymentList data={data} onChange={setData} />
        )}
        {activeTab === 'balances' && <BalanceSheet data={data} />}
      </main>
    </div>
  )
}
