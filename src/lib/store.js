import { STORAGE_KEY, createEmptyData } from './data.js'

export function getLocalFiles() {
  try {
    const raw = localStorage.getItem('shared-expenses-file-list')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalFiles(files) {
  localStorage.setItem('shared-expenses-file-list', JSON.stringify(files))
}

export function getLocalFileData(fileId) {
  try {
    const raw = localStorage.getItem(`shared-expenses-file-${fileId}`)
    if (!raw) return { name: 'Untitled', ...createEmptyData() }
    const parsed = JSON.parse(raw)
    return {
      name: parsed.name || 'Untitled',
      people: Array.isArray(parsed.people) ? parsed.people : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    }
  } catch {
    return { name: 'Untitled', ...createEmptyData() }
  }
}

export function saveLocalFileData(fileId, data) {
  localStorage.setItem(`shared-expenses-file-${fileId}`, JSON.stringify(data))
}

export function updateFileMetadata(fileId, updates) {
  const files = getLocalFiles()
  const idx = files.findIndex((f) => f.id === fileId)
  if (idx !== -1) {
    files[idx] = { ...files[idx], ...updates }
    saveLocalFiles(files)
  }
}

export function deleteLocalFile(fileId) {
  const files = getLocalFiles()
  const filtered = files.filter((f) => f.id !== fileId)
  saveLocalFiles(filtered)
  localStorage.removeItem(`shared-expenses-file-${fileId}`)
}

export function migrateOldData() {
  try {
    const oldRaw = localStorage.getItem(STORAGE_KEY)
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw)
      if (
        parsed &&
        (parsed.people?.length || parsed.expenses?.length || parsed.payments?.length)
      ) {
        const filesList = getLocalFiles()
        const fileId = 'local-default'
        const hasDefault = filesList.some((f) => f.id === fileId)
        if (!hasDefault) {
          const newFile = {
            id: fileId,
            name: 'Default Project',
            type: 'local',
            updatedAt: new Date().toISOString(),
          }
          filesList.unshift(newFile)
          saveLocalFiles(filesList)
          saveLocalFileData(fileId, {
            name: 'Default Project',
            people: parsed.people || [],
            expenses: parsed.expenses || [],
            payments: parsed.payments || [],
          })
        }
      }
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    console.error('Migration error:', e)
  }
}

export function exportToFile(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.name || 'shared-expenses'}-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const data = {
          name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          people: Array.isArray(parsed.people) ? parsed.people : [],
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        }
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

