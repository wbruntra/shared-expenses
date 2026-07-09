import { useState } from 'preact/hooks'
import { FiCheck, FiX } from 'react-icons/fi'
import { createPayment, roundMoney } from '../lib/data.js'

export function PaymentForm({ data, payment, onSave, onCancel }) {
  const people = data.people
  const isEdit = Boolean(payment)
  const [from, setFrom] = useState(payment?.from || '')
  const [to, setTo] = useState(payment?.to || '')
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '')
  const [date, setDate] = useState(
    payment?.date || new Date().toISOString().slice(0, 10)
  )
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const numAmount = roundMoney(Number(amount))
    if (!from) return setError('Select who paid.')
    if (!to) return setError('Select who received the payment.')
    if (from === to) return setError('Payer and recipient must be different.')
    if (!numAmount || numAmount <= 0) return setError('Amount must be greater than zero.')

    const next = createPayment({
      from,
      to,
      amount: numAmount,
      date,
    })
    if (isEdit) next.id = payment.id

    onSave(next)
  }

  if (people.length < 2) {
    return <p class="hint">Add at least two people before recording payments.</p>
  }

  return (
    <form class="form" onSubmit={handleSubmit}>
      {error && <div class="error">{error}</div>}

      <div class="field-row">
        <div class="field">
          <label for="payment-from">From</label>
          <select
            id="payment-from"
            value={from}
            onChange={(e) => setFrom(e.currentTarget.value)}
          >
            <option value="">Select…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="payment-to">To</label>
          <select
            id="payment-to"
            value={to}
            onChange={(e) => setTo(e.currentTarget.value)}
          >
            <option value="">Select…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="payment-amount">Amount</label>
          <input
            id="payment-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onInput={(e) => setAmount(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="payment-date">Date</label>
          <input
            id="payment-date"
            type="date"
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
          />
        </div>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="icon-button"
          aria-label={isEdit ? 'Update payment' : 'Add payment'}
          title={isEdit ? 'Update payment' : 'Add payment'}
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
