import { useState } from 'preact/hooks'
import { FiCopy, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { formatCurrency } from '../lib/data.js'
import { useMediaQuery } from '../lib/use-media-query.js'
import { ExpenseForm } from './ExpenseForm.jsx'

export function ExpenseList({ data, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [duplicatingExpense, setDuplicatingExpense] = useState(null)
  const isMobile = useMediaQuery('(max-width: 600px)')
  const peopleById = Object.fromEntries(data.people.map((p) => [p.id, p]))

  const sortedExpenses = [...data.expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )

  function handleSave(expense) {
    if (editingId) {
      onChange({
        ...data,
        expenses: data.expenses.map((e) => (e.id === editingId ? expense : e)),
      })
      setEditingId(null)
    } else {
      onChange({
        ...data,
        expenses: [...data.expenses, expense],
      })
    }
    setDuplicatingExpense(null)
    setShowForm(false)
  }

  function handleDelete(id) {
    if (window.confirm('Delete this expense?')) {
      onChange({
        ...data,
        expenses: data.expenses.filter((e) => e.id !== id),
      })
    }
  }

  function handleEdit(expense) {
    setEditingId(expense.id)
    setDuplicatingExpense(null)
    setShowForm(true)
  }

  function handleDuplicate(expense) {
    setEditingId(null)
    setDuplicatingExpense(expense)
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setDuplicatingExpense(null)
  }

  function formatShares(split) {
    return Object.entries(split)
      .map(
        ([id, amount]) => `${peopleById[id]?.name}: ${formatCurrency(amount)}`
      )
      .join(', ')
  }

  return (
    <section class="panel">
      <div class="panel-header">
        <h2>Expenses</h2>
        {!showForm && (
          <button
            type="button"
            class="icon-button"
            onClick={() => {
              setEditingId(null)
              setDuplicatingExpense(null)
              setShowForm(true)
            }}
            aria-label="Add expense"
            title="Add expense"
          >
            <FiPlus />
          </button>
        )}
      </div>

      {showForm && (
        <ExpenseForm
          data={data}
          expense={
            editingId
              ? data.expenses.find((e) => e.id === editingId)
              : undefined
          }
          initialData={duplicatingExpense || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {sortedExpenses.length === 0 ? (
        <p class="empty">No expenses yet.</p>
      ) : isMobile ? (
        <ul class="card-list">
          {sortedExpenses.map((expense) => (
            <li key={expense.id} class="card expense-card">
              <div class="card-header">
                <span class="card-title">{expense.description}</span>
                <span class="card-amount">{formatCurrency(expense.amount)}</span>
              </div>
              <div class="card-meta">
                <span>{expense.date}</span>
                <span>·</span>
                <span>Paid by {peopleById[expense.paidBy]?.name}</span>
              </div>
              <div class="card-shares">{formatShares(expense.split)}</div>
              <div class="card-actions">
                <button
                  type="button"
                  class="icon-button secondary"
                  onClick={() => handleEdit(expense)}
                  aria-label="Edit"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  class="icon-button secondary"
                  onClick={() => handleDuplicate(expense)}
                  aria-label="Duplicate"
                  title="Duplicate"
                >
                  <FiCopy />
                </button>
                <button
                  type="button"
                  class="icon-button danger"
                  onClick={() => handleDelete(expense.id)}
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
                <th>Description</th>
                <th>Paid by</th>
                <th class="numeric">Amount</th>
                <th>Shares</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.description}</td>
                  <td>{peopleById[expense.paidBy]?.name}</td>
                  <td class="numeric">{formatCurrency(expense.amount)}</td>
                  <td class="shares">{formatShares(expense.split)}</td>
                  <td class="actions">
                    <button
                      type="button"
                      class="icon-button secondary"
                      onClick={() => handleEdit(expense)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      class="icon-button secondary"
                      onClick={() => handleDuplicate(expense)}
                      aria-label="Duplicate"
                      title="Duplicate"
                    >
                      <FiCopy />
                    </button>
                    <button
                      type="button"
                      class="icon-button danger"
                      onClick={() => handleDelete(expense.id)}
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
