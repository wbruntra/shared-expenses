import { useState, useEffect } from 'preact/hooks'
import { FiCheck, FiX } from 'react-icons/fi'
import { createExpense, equalSplit, formatCurrency, roundMoney } from '../lib/data.js'

export function ExpenseForm({ data, expense, initialData, onSave, onCancel }) {
  const people = data.people
  const isEdit = Boolean(expense)
  const source = expense || initialData
  const today = new Date().toISOString().slice(0, 10)
  const [description, setDescription] = useState(source?.description || '')
  const [amount, setAmount] = useState(
    source ? String(source.amount) : ''
  )
  const [date, setDate] = useState(
    initialData ? today : source?.date || today
  )
  const [paidBy, setPaidBy] = useState(source?.paidBy || '')
  const [selected, setSelected] = useState(() =>
    source ? Object.keys(source.split) : people.map((p) => p.id)
  )
  const [equal, setEqual] = useState(() => {
    if (!source) return true
    const shares = Object.values(source.split)
    if (shares.length === 0) return true
    const first = shares[0]
    return shares.every((s) => Math.abs(s - first) < 0.01)
  })
  const [split, setSplit] = useState(() =>
    source ? { ...source.split } : {}
  )
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit && equal) {
      setSplit(equalSplit(Number(amount) || 0, selected))
    }
  }, [amount, selected.join(','), equal, isEdit])

  function toggleSelected(id) {
    setSelected((prev) => {
      const removing = prev.includes(id)
      const next = removing
        ? prev.filter((x) => x !== id)
        : [...prev, id]
      if (removing) {
        setSplit((prevSplit) => {
          const { [id]: _removed, ...rest } = prevSplit
          if (equal) return equalSplit(Number(amount) || 0, next)
          return rest
        })
      } else if (equal) {
        setSplit(equalSplit(Number(amount) || 0, next))
      }
      return next
    })
  }

  function handleAmountChange(value) {
    setAmount(value)
    const num = Number(value) || 0
    if (equal) {
      setSplit(equalSplit(num, selected))
    }
  }

  function handleEqualChange(nextEqual) {
    setEqual(nextEqual)
    if (nextEqual) {
      setSplit(equalSplit(Number(amount) || 0, selected))
    }
  }

  function handleSplitChange(id, value) {
    setSplit((prev) => ({ ...prev, [id]: roundMoney(Number(value) || 0) }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const numAmount = roundMoney(Number(amount))
    if (!description.trim()) return setError('Description is required.')
    if (!numAmount || numAmount <= 0) return setError('Amount must be greater than zero.')
    if (!paidBy) return setError('Select who paid.')
    if (selected.length === 0) return setError('Select at least one participant.')

    const splitTotal = Object.values(split).reduce((a, b) => a + b, 0)
    if (Math.abs(splitTotal - numAmount) > 0.01) {
      return setError(
        `Shares must add up to the total amount (currently ${formatCurrency(splitTotal)} vs ${formatCurrency(numAmount)}).`
      )
    }

    const next = createExpense({
      description: description.trim(),
      amount: numAmount,
      date,
      paidBy,
      split: Object.fromEntries(
        selected.map((id) => [id, roundMoney(split[id] || 0)])
      ),
    })

    if (isEdit) {
      next.id = expense.id
    }

    onSave(next)
  }

  if (people.length < 2) {
    return (
      <p class="hint">Add at least two people before creating expenses.</p>
    )
  }

  return (
    <form class="form" onSubmit={handleSubmit}>
      {error && <div class="error">{error}</div>}

      <div class="field">
        <label for="expense-description">Description</label>
        <input
          id="expense-description"
          type="text"
          value={description}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="expense-amount">Amount</label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onInput={(e) => handleAmountChange(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="expense-date">Date</label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="expense-paid-by">Paid by</label>
          <select
            id="expense-paid-by"
            value={paidBy}
            onChange={(e) => setPaidBy(e.currentTarget.value)}
          >
            <option value="">Select…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset class="field">
        <legend>Participants</legend>
        <div class="checkbox-grid">
          {people.map((p) => (
            <label key={p.id} class="checkbox">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggleSelected(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div class="field">
        <label class="checkbox">
          <input
            type="checkbox"
            checked={equal}
            onChange={(e) => handleEqualChange(e.currentTarget.checked)}
          />
          Equal split
        </label>
      </div>

      <div class="split-list">
        {selected.map((id) => {
          const person = people.find((p) => p.id === id)
          return (
            <div key={id} class="split-row">
              <span>{person?.name}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={split[id] ?? ''}
                disabled={equal}
                onInput={(e) => handleSplitChange(id, e.currentTarget.value)}
              />
            </div>
          )
        })}
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="icon-button"
          aria-label={isEdit ? 'Update expense' : 'Add expense'}
          title={isEdit ? 'Update expense' : 'Add expense'}
        >
          <FiCheck />
        </button>
        <button
          type="button"
          class="icon-button secondary"
          onClick={onCancel}
          aria-label="Cancel"
          title="Cancel"
        >
          <FiX />
        </button>
      </div>
    </form>
  )
}
