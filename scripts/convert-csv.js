import fs from 'fs'
import { createId } from '../src/lib/data.js'

const START_YEAR = Number(process.argv[2]) || 2025

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, december: 11,
}

function parseMonth(str) {
  const key = str.toLowerCase().trim()
  return MONTHS[key]
}

function createDateParser() {
  let currentYear = START_YEAR
  let lastMonth = -1
  let lastDate = null

  return function parseDate(raw) {
    const str = (raw || '').trim()
    if (!str) return lastDate ? new Date(lastDate) : null

    let month
    let day
    let year = currentYear

    // Format: 4/1/2025 (month/day/year)
    const fullDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (fullDateMatch) {
      month = Number(fullDateMatch[1]) - 1
      day = Number(fullDateMatch[2])
      year = Number(fullDateMatch[3])
    } else if (/^\d{1,2}\/\d{1,2}$/.test(str)) {
      // Format: 4/27 (month/day)
      const parts = str.split('/').map(Number)
      month = parts[0] - 1
      day = parts[1]
    } else {
      // Format: 1-Apr, 17-Apr, 1-June, 1-July, 1-Aug
      const match = str.match(/^(\d{1,2})-([A-Za-z]+)$/)
      if (match) {
        day = Number(match[1])
        month = parseMonth(match[2])
      }
    }

    if (month === undefined || day === undefined) {
      return lastDate ? new Date(lastDate) : null
    }

    // For dates without an explicit year, infer the year from month progression.
    if (year === currentYear && lastMonth !== -1 && month < lastMonth && lastMonth >= 6) {
      currentYear += 1
      year = currentYear
    }
    lastMonth = month

    const d = new Date(year, month, day)
    lastDate = d
    return d
  }
}

function formatDate(d) {
  if (!d) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isPaymentRow(description) {
  const d = (description || '').trim().toLowerCase()
  return d === '(payment)' || d === 'transfer'
}

function parseAmount(raw) {
  const str = (raw || '').trim().replace(',', '.')
  const num = parseFloat(str)
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0
}

function parseCsv(path) {
  const raw = fs.readFileSync(path, 'utf-8')
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '')
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const values = line.split(',')
    const row = {}
    header.forEach((col, i) => {
      row[col] = (values[i] || '').trim()
    })
    return row
  })
}

function main() {
  const csvPath = new URL('../gastos_compartidos.csv', import.meta.url)
  const rows = parseCsv(csvPath)
  const parseDate = createDateParser()

  const mariaId = createId()
  const williamId = createId()

  const people = [
    { id: mariaId, name: 'Maria' },
    { id: williamId, name: 'William' },
  ]

  const expenses = []
  const payments = []

  for (const row of rows) {
    const description = (row.description || '').trim()
    const date = parseDate(row.date)

    const mariaAmount = parseAmount(row.maria)
    const williamAmount = parseAmount(row.william)

    if (mariaAmount > 0) {
      expenses.push({
        id: createId(),
        description,
        amount: mariaAmount,
        date: formatDate(date),
        paidBy: mariaId,
        split: {
          [williamId]: mariaAmount,
        },
      })
    } else if (williamAmount > 0) {
      payments.push({
        id: createId(),
        from: williamId,
        to: mariaId,
        amount: williamAmount,
        date: formatDate(date),
      })
    }
  }

  const data = { people, expenses, payments }
  const outPath = new URL('../gastos_compartidos.json', import.meta.url)
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2))

  console.log(`Converted ${rows.length} CSV rows into:`)
  console.log(`  - ${expenses.length} expenses`)
  console.log(`  - ${payments.length} payments`)
  console.log(`  - ${people.length} people`)
  console.log(`Wrote ${outPath.pathname}`)
}

main()
