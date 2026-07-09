import { useState } from 'preact/hooks'
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { createPerson, isPersonReferenced } from '../lib/data.js'

export function PeopleManager({ data, onChange }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    const person = createPerson(trimmed)
    onChange({ ...data, people: [...data.people, person] })
    setNewName('')
  }

  function handleStartEdit(person) {
    setEditingId(person.id)
    setEditName(person.name)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) return
    onChange({
      ...data,
      people: data.people.map((p) =>
        p.id === editingId ? { ...p, name: trimmed } : p
      ),
    })
    setEditingId(null)
    setEditName('')
  }

  function handleDelete(id) {
    if (isPersonReferenced(data, id)) {
      window.alert(
        'This person is referenced by an expense or payment and cannot be deleted.'
      )
      return
    }
    onChange({
      ...data,
      people: data.people.filter((p) => p.id !== id),
    })
  }

  return (
    <div class="people-manager">
      <form class="inline-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Name"
          value={newName}
          onInput={(e) => setNewName(e.currentTarget.value)}
        />
        <button
          type="submit"
          class="icon-button"
          aria-label="Add person"
          title="Add person"
        >
          <FiPlus />
        </button>
      </form>

      {data.people.length === 0 ? (
        <p class="empty">No people yet. Add at least two to start splitting expenses.</p>
      ) : (
        <ul class="item-list">
          {data.people.map((person) => (
            <li key={person.id} class="item">
              {editingId === person.id ? (
                <form class="inline-form" onSubmit={handleSaveEdit}>
                  <input
                    type="text"
                    value={editName}
                    onInput={(e) => setEditName(e.currentTarget.value)}
                  />
                  <button
                    type="submit"
                    class="icon-button"
                    aria-label="Save"
                    title="Save"
                  >
                    <FiCheck />
                  </button>
                  <button
                    type="button"
                    class="icon-button secondary"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    <FiX />
                  </button>
                </form>
              ) : (
                <>
                  <span class="item-name">{person.name}</span>
                  <div class="item-actions">
                    <button
                      type="button"
                      class="icon-button secondary"
                      onClick={() => handleStartEdit(person)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      class="icon-button danger"
                      onClick={() => handleDelete(person.id)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
