import { STORAGE_KEY, createEmptyData } from './data.js'

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyData()
    const parsed = JSON.parse(raw)
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    }
  } catch {
    return createEmptyData()
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportToFile(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shared-expenses-${new Date().toISOString().slice(0, 10)}.json`
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
