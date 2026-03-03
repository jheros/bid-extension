import { useState, useEffect } from 'react'
import { X, UserPlus } from 'lucide-react'
import { RoleBadge } from '../ui/index.js'

export default function GroupSettingsModal({
  group,
  users,
  userById,
  onClose,
  onApplyChanges,
}) {
  const baseMemberIds = new Set(group.member_ids || [])

  const [nameInput, setNameInput] = useState(group.name || '')
  const [pendingAdds, setPendingAdds] = useState(new Set())
  const [pendingRemoves, setPendingRemoves] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setNameInput(group.name || '')
  }, [group.id, group.name])

  const effectiveMemberIds = new Set([
    ...baseMemberIds,
    ...pendingAdds
  ])
  pendingRemoves.forEach((id) => effectiveMemberIds.delete(id))

  const memberUsers = [...effectiveMemberIds].map((id) => userById[id]).filter(Boolean)
  const availableToAdd = users.filter((u) => !effectiveMemberIds.has(u.id))

  const nameChanged = (nameInput.trim() || '') !== (group.name || '').trim()
  const hasChanges = nameChanged || pendingAdds.size > 0 || pendingRemoves.size > 0

  const handleAdd = (userId) => {
    setPendingAdds((prev) => new Set([...prev, userId]))
    setPendingRemoves((prev) => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }

  const handleRemove = (userId) => {
    setPendingRemoves((prev) => new Set([...prev, userId]))
    setPendingAdds((prev) => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!hasChanges) {
      onClose()
      return
    }
    setSubmitting(true)
    try {
      await onApplyChanges(group.id, {
        name: nameChanged ? nameInput.trim() : undefined,
        adds: [...pendingAdds],
        removes: [...pendingRemoves]
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <h3 className="font-semibold text-white">Group settings</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <div>
            <label htmlFor="group-settings-name" className="block text-sm font-medium text-gray-400 mb-2">Group name</label>
            <input
              id="group-settings-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Group name"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Members ({memberUsers.length})</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {memberUsers.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">No members yet</p>
              ) : (
                memberUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white">{u.name || u.id}</span>
                      <RoleBadge role={u.role} />
                    </div>
                    <button
                      onClick={() => handleRemove(u.id)}
                      className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded hover:bg-red-950/30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {availableToAdd.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Add member</h4>
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-gray-500 shrink-0" />
                <select
                  value=""
                  onChange={(e) => {
                    const uid = e.target.value
                    if (uid) handleAdd(uid)
                    e.target.value = ''
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  <option value="">Select user to add...</option>
                  {availableToAdd.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.id}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-800 shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !hasChanges || (nameChanged && !nameInput.trim())}
            className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
