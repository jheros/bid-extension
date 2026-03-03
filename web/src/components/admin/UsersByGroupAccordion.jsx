import { ChevronDown, ChevronRight, Eye, Settings } from 'lucide-react'
import { RoleBadge } from '../ui/index.js'

function UserRow({ user, onView }) {
  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 text-white font-medium">{user.name}</td>
      <td className="px-4 py-3 text-gray-300">{user.application_count}</td>
      <td className="px-4 py-3 text-gray-300">{user.daily_count ?? '—'}</td>
      <td className="px-4 py-3 text-gray-300">{user.weekly_count ?? '—'}</td>
      <td className="px-4 py-3 text-gray-300">{user.monthly_count ?? '—'}</td>
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {new Date(user.created_at).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        })}
      </td>
      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView(user)}
          title="View applications"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  )
}

function GroupAccordionSection({
  group,
  userById,
  expanded,
  onToggle,
  onView,
  onOpenGroupSettings,
}) {
  const memberUsers = (group.member_ids || []).map((id) => userById[id]).filter(Boolean)

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-2">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
          <span className="font-medium text-white">{group.name}</span>
          <span className="text-xs text-gray-500">({memberUsers.length} members)</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenGroupSettings(group) }}
          title="Group settings"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
        >
          <Settings size={16} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left bg-gray-900/50">
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Applications</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Weekly</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {memberUsers.map((u) => (
                  <UserRow key={u.id} user={u} onView={onView} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function UngroupedSection({ users, onView }) {
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-800">
        <span className="font-medium text-gray-400">Ungrouped</span>
        <span className="text-xs text-gray-500 ml-2">({users.length} users)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left bg-gray-900/50">
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Applications</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Weekly</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u) => (
              <UserRow key={u.id} user={u} onView={onView} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function UsersByGroupAccordion({
  users,
  groups,
  expandedGroupIds,
  onToggleGroup,
  onView,
  onOpenGroupSettings,
  showUngrouped = true,
}) {
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const ungrouped = users.filter((u) => !(u.group_ids || []).length)

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GroupAccordionSection
          key={group.id}
          group={group}
          userById={userById}
          expanded={expandedGroupIds.has(group.id)}
          onToggle={() => onToggleGroup(group.id)}
          onView={onView}
          onOpenGroupSettings={onOpenGroupSettings}
        />
      ))}
      {showUngrouped && ungrouped.length > 0 && (
        <UngroupedSection users={ungrouped} onView={onView} />
      )}
    </div>
  )
}
