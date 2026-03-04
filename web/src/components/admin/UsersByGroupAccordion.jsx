import { Eye, Settings } from 'lucide-react'
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

function GroupRow({ title, count, onOpenGroupSettings, group }) {
  return (
    <tr className="bg-gray-800/35 border-t border-gray-700">
      <td colSpan={8} className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{title}</span>
            <span className="text-xs text-gray-500">({count} users)</span>
          </div>
          {group && (
            <button
              onClick={() => onOpenGroupSettings(group)}
              title="Group settings"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function UsersByGroupAccordion({
  users,
  groups,
  onView,
  onOpenGroupSettings,
  showUngrouped = true,
}) {
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const ungrouped = users.filter((u) => !(u.group_ids || []).length)
  const groupSections = groups.map((group) => ({
    group,
    title: group.name,
    members: (group.member_ids || []).map((id) => userById[id]).filter(Boolean),
  }))

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
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
          <tbody>
            {groupSections.map(({ group, title, members }) => ([
              <GroupRow
                key={`group-${group.id}`}
                title={title}
                count={members.length}
                group={group}
                onOpenGroupSettings={onOpenGroupSettings}
              />,
              ...(members.length > 0
                ? members.map((u) => (
                    <UserRow key={`group-${group.id}-user-${u.id}`} user={u} onView={onView} />
                  ))
                : [
                    <tr key={`group-${group.id}-empty`} className="border-t border-gray-800">
                      <td colSpan={8} className="px-4 py-3 text-sm text-gray-500">
                        No users in this group
                      </td>
                    </tr>
                  ])
            ]))}
            {showUngrouped && (
              <>
                <GroupRow
                  key="ungrouped-header"
                  title="Ungrouped"
                  count={ungrouped.length}
                  onOpenGroupSettings={onOpenGroupSettings}
                />
                {ungrouped.length > 0 ? (
                  ungrouped.map((u) => (
                    <UserRow key={`ungrouped-user-${u.id}`} user={u} onView={onView} />
                  ))
                ) : (
                  <tr key="ungrouped-empty" className="border-t border-gray-800">
                    <td colSpan={8} className="px-4 py-3 text-sm text-gray-500">
                      No ungrouped users
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
