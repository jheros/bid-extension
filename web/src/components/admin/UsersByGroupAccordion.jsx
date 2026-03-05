import { Eye, Settings } from 'lucide-react'
import { RoleBadge } from '../ui/index.js'

const USER_BADGE_COLORS = [
  'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
  'bg-purple-900/60 text-purple-300 border-purple-700/50',
  'bg-pink-900/60 text-pink-300 border-pink-700/50',
  'bg-amber-900/60 text-amber-300 border-amber-700/50',
  'bg-green-900/60 text-green-300 border-green-700/50',
  'bg-blue-900/60 text-blue-300 border-blue-700/50',
  'bg-rose-900/60 text-rose-300 border-rose-700/50',
  'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
]

function userBadgeColor(userId) {
  if (!userId) return 'bg-gray-800/60 text-gray-400 border-gray-600/50'
  const hash = [...userId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return USER_BADGE_COLORS[hash % USER_BADGE_COLORS.length]
}

function UserProfileRow({ user, profile, isTotal, onView }) {
  const appCount = isTotal ? (user.application_count ?? 0) : (profile?.application_count ?? 0)
  const dailyCount = isTotal ? (user.daily_count ?? 0) : (profile?.daily_count ?? 0)
  const weeklyCount = isTotal ? (user.weekly_count ?? 0) : (profile?.weekly_count ?? 0)
  const monthlyCount = isTotal ? (user.monthly_count ?? 0) : (profile?.monthly_count ?? 0)
  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        {isTotal ? <span className="text-white font-medium">{user.name}</span> : ''}
      </td>
      <td className="px-4 py-3">
        {isTotal ? (
          <span className="font-medium text-gray-200">{profile?.name ?? 'Total'}</span>
        ) : (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${userBadgeColor(user?.id)}`}>
            {profile?.name ?? 'Total'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-300">{appCount}</td>
      <td className="px-4 py-3 text-gray-300">{dailyCount}</td>
      <td className="px-4 py-3 text-gray-300">{weeklyCount}</td>
      <td className="px-4 py-3 text-gray-300">{monthlyCount}</td>
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {((isTotal ? user.created_at : profile?.created_at) ?? null)
          ? new Date(isTotal ? user.created_at : profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : (isTotal ? '—' : '')}
      </td>
      <td className="px-4 py-3">{isTotal ? <RoleBadge role={user.role} /> : ''}</td>
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

function GroupRow({ title, count, applicationCount, dailyCount, weeklyCount, monthlyCount, onOpenGroupSettings, group }) {
  const day = dailyCount ?? 0
  const week = weeklyCount ?? 0
  const month = monthlyCount ?? 0
  return (
    <tr className="bg-gray-800/35 border-t border-gray-700">
      <td colSpan={9} className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{title}</span>
            <span className="text-xs text-gray-500">
              ({count} users · {applicationCount ?? 0} applications
              <span className="text-gray-600"> · day: {day} · week: {week} · month: {month}</span>)
            </span>
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
  const sumCounts = (members) => ({
    applicationCount: members.reduce((s, u) => s + (u.application_count ?? 0), 0),
    dailyCount: members.reduce((s, u) => s + (u.daily_count ?? 0), 0),
    weeklyCount: members.reduce((s, u) => s + (u.weekly_count ?? 0), 0),
    monthlyCount: members.reduce((s, u) => s + (u.monthly_count ?? 0), 0),
  })
  const groupSections = groups.map((group) => {
    const members = (group.member_ids || []).map((id) => userById[id]).filter(Boolean)
    return { group, title: group.name, members, ...sumCounts(members) }
  })
  const ungroupedCounts = sumCounts(ungrouped)

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
            {groupSections.map(({ group, title, members, applicationCount, dailyCount, weeklyCount, monthlyCount }) => ([
              <GroupRow
                key={`group-${group.id}`}
                title={title}
                count={members.length}
                applicationCount={applicationCount}
                dailyCount={dailyCount}
                weeklyCount={weeklyCount}
                monthlyCount={monthlyCount}
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
                  applicationCount={ungroupedCounts.applicationCount}
                  dailyCount={ungroupedCounts.dailyCount}
                  weeklyCount={ungroupedCounts.weeklyCount}
                  monthlyCount={ungroupedCounts.monthlyCount}
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
