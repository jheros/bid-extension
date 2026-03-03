import { useState } from 'react'
import { X } from 'lucide-react'

export default function CreateGroupModal({ onClose, onSubmit, users = [] }) {
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)

  const toggleUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onSubmit(trimmed, [...selectedIds])
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <h3 className="font-semibold text-white">Create Group</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 flex flex-col min-h-0">
          <div>
            <label htmlFor="group-name" className="block text-sm text-gray-400 mb-1">Group name</label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Team"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
              autoFocus
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="block text-sm text-gray-400 mb-2">Add members</label>
            <div className="border border-gray-700 rounded-lg overflow-y-auto max-h-40 py-1">
              {users.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">No users available</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {users.map((u) => (
                    <li key={u.id} className="px-3 py-1.5 hover:bg-gray-800/50">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm text-white">{u.name || u.id}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
