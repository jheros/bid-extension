import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Check, Loader2 } from 'lucide-react'
import supabase from '../../lib/supabase.js'
import { api } from '../../lib/api.js'

export default function UserSettingsModal({ user, profile, profiles, onClose, onProfilesChange, onUserNameChange }) {
  const [displayName, setDisplayName] = useState(profile?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setDisplayName(profile?.name ?? '')
  }, [profile?.name])

  const handleSaveDisplayName = async (e) => {
    e?.preventDefault?.()
    const name = displayName.trim()
    if (!name || !user?.id) return
    if (name === (profile?.name ?? '')) return
    setSavingName(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id)
      if (err) throw new Error(err.message)
      onUserNameChange?.({ name, role: profile?.role })
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingName(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError('')
    try {
      await api.profiles.createProfile(name)
      setNewName('')
      const updated = await api.profiles.getProfiles()
      onProfilesChange(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (profile) => {
    setEditingId(profile.id)
    setEditName(profile.name)
    setError('')
  }

  const handleEdit = async (id) => {
    const name = editName.trim()
    if (!name) return
    setError('')
    try {
      await api.profiles.updateProfile(id, name)
      setEditingId(null)
      const updated = await api.profiles.getProfiles()
      onProfilesChange(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this profile? Applications linked to it will become unlinked.')) return
    setDeletingId(id)
    setError('')
    try {
      await api.profiles.deleteProfile(id)
      const updated = await api.profiles.getProfiles()
      onProfilesChange(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Display name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Display name</label>
            <form onSubmit={handleSaveDisplayName} className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={handleSaveDisplayName}
                placeholder="Your name"
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
              {savingName && <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />}
            </form>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Profiles</h3>
            <p className="text-xs text-gray-400 mb-3">
              Profiles let you track applications under different identities (e.g. different resumes or personas).
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <ul className="space-y-2">
            {profiles.length === 0 && (
              <li className="text-sm text-gray-500 text-center py-4">No profiles yet. Add one below.</li>
            )}
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2.5">
                {editingId === p.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEdit(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                    <button
                      onClick={() => handleEdit(p.id)}
                      className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-gray-700 transition-colors"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white truncate">{p.name}</span>
                    <button
                      onClick={() => startEdit(p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      title="Rename profile"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
                      title="Delete profile"
                    >
                      {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleCreate} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New profile name…"
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
