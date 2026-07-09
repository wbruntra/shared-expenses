import { useState } from 'preact/hooks'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { formatCurrency } from '../lib/data.js'
import { useMediaQuery } from '../lib/use-media-query.js'
import { PaymentForm } from './PaymentForm.jsx'

export function PaymentList({ data, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const isMobile = useMediaQuery('(max-width: 600px)')
  const peopleById = Object.fromEntries(data.people.map((p) => [p.id, p]))

  const sortedPayments = [...data.payments].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )

  function handleSave(payment) {
    if (editingId) {
      onChange({
        ...data,
        payments: data.payments.map((p) => (p.id === editingId ? payment : p)),
      })
      setEditingId(null)
    } else {
      onChange({
        ...data,
        payments: [...data.payments, payment],
      })
    }
    setShowForm(false)
  }

  function handleDelete(id) {
    if (window.confirm('Delete this payment?')) {
      onChange({
        ...data,
        payments: data.payments.filter((p) => p.id !== id),
      })
    }
  }

  function handleEdit(payment) {
    setEditingId(payment.id)
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
  }

  return (
    <section class="panel">
      <div class="panel-header">
        <h2>Payments</h2>
        {!showForm && (
          <button
            type="button"
            class="icon-button"
            onClick={() => setShowForm(true)}
            aria-label="Add payment"
            title="Add payment"
          >
            <FiPlus />
          </button>
        )}
      </div>

      {showForm && (
        <PaymentForm
          data={data}
          payment={
            editingId
              ? data.payments.find((p) => p.id === editingId)
              : undefined
          }
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {sortedPayments.length === 0 ? (
        <p class="empty">No payments yet.</p>
      ) : isMobile ? (
        <ul class="card-list">
          {sortedPayments.map((payment) => (
            <li key={payment.id} class="card payment-card">
              <div class="card-header">
                <span class="card-title">
                  {peopleById[payment.from]?.name} → {peopleById[payment.to]?.name}
                </span>
                <span class="card-amount">{formatCurrency(payment.amount)}</span>
              </div>
              <div class="card-meta">
                <span>{payment.date}</span>
              </div>
              <div class="card-actions">
                <button
                  type="button"
                  class="icon-button secondary"
                  onClick={() => handleEdit(payment)}
                  aria-label="Edit"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  class="icon-button danger"
                  onClick={() => handleDelete(payment.id)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th class="numeric">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date}</td>
                  <td>{peopleById[payment.from]?.name}</td>
                  <td>{peopleById[payment.to]?.name}</td>
                  <td class="numeric">{formatCurrency(payment.amount)}</td>
                  <td class="actions">
                    <button
                      type="button"
                      class="icon-button secondary"
                      onClick={() => handleEdit(payment)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      class="icon-button danger"
                      onClick={() => handleDelete(payment.id)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
