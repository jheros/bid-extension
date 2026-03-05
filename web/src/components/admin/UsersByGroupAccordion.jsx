import { Eye, Settings } from 'lucide-react'
import { RoleBadge } from '../ui/index.js'

const USER_COLORS = [
  'text-cyan-400',
  'text-purple-400',
  'text-pink-400',
  'text-amber-400',
  'text-green-400',
  'text-blue-400',
  'text-rose-400',
  'text-emerald-400',
]

function userColor(userId) {
  if (!userId) return 'text-gray-400'
  const hash = [...userId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return USER_COLORS[hash % USER_COLORS.length]
}

function UserProfileRow({ user, profile, isTotal, onView }) {
  const appCount = isTotal ? (user.application_count ?? 0) : (profile?.application_count ?? 0)
  const dailyCount = isTotal ? (user.daily_count ?? 0) : (profile?.daily_count ?? 0)
  const weeklyCount = isTotal ? (user.weekly_count ?? 0) : (profile?.weekly_count ?? 0)
  const monthlyCount = isTotal ? (user.monthly_count ?? 0) : (profile?.monthly_count ?? 0)
  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        {isTotal ? <span className="text-white font-medium">{user.name}</span> : <span className="text-gray-600">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`${isTotal ? 'font-medium text-gray-200' : userColor(user?.id)}`}>
          {profile?.name ?? 'Total'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-300">{appCount}</td>
      <td className="px-4 py-3 text-gray-300">{dailyCount}</td>
      <td className="px-4 py-3 text-gray-300">{weeklyCount}</td>
      <td className="px-4 py-3 text-gray-300">{monthlyCount}</td>
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {((isTotal ? user.created_at : profile?.created_at) ?? null)
          ? new Date(isTotal ? user.created_at : profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—'}
      </td>
      <td className="px-4 py-3">{isTotal ? <RoleBadge role={user.role} /> : <span className="text-gray-600">—</span>}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView(user, profile?.id)}
          title="View applications"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  )
}

function UserRows({ user, onView }) {
  const profiles = user.profiles || []
  const hasProfiles = profiles.length > 0
  return (
    <>
      <UserProfileRow user={user} profile={null} isTotal onView={onView} />
      {hasProfiles && profiles.map((p) => (
        <UserProfileRow key={p.id ?? `null-${p.name}`} user={user} profile={p} isTotal={false} onView={onView} />
      ))}
    </>
  )
}

function GroupRow({ title, count, onOpenGroupSettings, group }) {
  return (
    <tr className="bg-gray-800/35 border-t border-gray-700">
      <td colSpan={9} className="px-4 py-2.5">
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
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Profile</th>
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
                    <UserRows key={`group-${group.id}-user-${u.id}`} user={u} onView={onView} />
                  ))
                : [
                    <tr key={`group-${group.id}-empty`} className="border-t border-gray-800">
                      <td colSpan={9} className="px-4 py-3 text-sm text-gray-500">
                        No users in this group
                      </td>
                    </tr>
                  ])
            ]))}
            {showUngrouped && ungrouped.length > 0 && (
              <>
                <GroupRow
                  key="ungrouped-header"
                  title="Ungrouped"
                  count={ungrouped.length}
                  onOpenGroupSettings={onOpenGroupSettings}
                />
                {ungrouped.map((u) => (
                  <UserRows key={`ungrouped-user-${u.id}`} user={u} onView={onView} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
