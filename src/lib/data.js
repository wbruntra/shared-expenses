export const STORAGE_KEY = 'shared-expenses-data'

export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyData() {
  return {
    people: [],
    expenses: [],
    payments: [],
  }
}

export function createPerson(name) {
  return { id: createId(), name: name.trim() }
}

export function createExpense(values = {}) {
  return {
    id: createId(),
    description: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    paidBy: '',
    split: {},
    ...values,
  }
}

export function createPayment(values = {}) {
  return {
    id: createId(),
    from: '',
    to: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    ...values,
  }
}

export function isPersonReferenced(data, personId) {
  return (
    data.expenses.some(
      (e) => e.paidBy === personId || Object.keys(e.split).includes(personId)
    ) || data.payments.some((p) => p.from === personId || p.to === personId)
  )
}

export function roundMoney(value) {
  return Math.round(value * 100) / 100
}

export function formatCurrency(value) {
  return `€${Number(value).toFixed(2)}`
}

export function equalSplit(amount, personIds) {
  if (!personIds.length) return {}
  const base = roundMoney(amount / personIds.length)
  const split = Object.fromEntries(personIds.map((id) => [id, base]))
  // Distribute rounding remainder to the first person so sums match exactly.
  const currentTotal = Object.values(split).reduce((a, b) => a + b, 0)
  const diff = roundMoney(amount - currentTotal)
  if (diff !== 0 && personIds.length > 0) {
    split[personIds[0]] = roundMoney(split[personIds[0]] + diff)
  }
  return split
}
