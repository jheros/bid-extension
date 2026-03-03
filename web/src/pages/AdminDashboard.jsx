import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, LogOut, ShieldCheck, Users, RefreshCw, ChevronLeft, Calendar, Eye, Plus, Search
} from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { getTodayBangkok, getBangkokDayRange } from '../lib/dateUtils.js'
import { PageHeader } from '../components/layout/index.js'
import { LoadingSpinner, Alert, EmptyState } from '../components/ui/index.js'
import {
  ApplicationFilters,
  ApplicationsTable,
  Pagination,
  ViewModeToggle,
} from '../components/applications/index.js'
import { UsersByGroupAccordion, CreateGroupModal, GroupSettingsModal } from '../components/admin/index.js'
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [view, setView] = useState('users')
  const [selectedUser, setSelectedUser] = useState(null)

  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState('')
  const [searchName, setSearchName] = useState('')
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set())
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupSettingsGroup, setGroupSettingsGroup] = useState(null)

  const [applications, setApplications] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [appsLoading, setAppsLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterJobType, setFilterJobType] = useState('')
  const [filterWorkType, setFilterWorkType] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const [appsViewMode, setAppsViewMode] = useState('list')
  const [calendarDate, setCalendarDate] = useState(() => getTodayBangkok())
  const [calendarUserId, setCalendarUserId] = useState('')
  const [pageInputVal, setPageInputVal] = useState('1')
  const [usersDate, setUsersDate] = useState(() => getTodayBangkok())

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  const fetchUsersAndGroups = useCallback(async () => {
    setUsersLoading(true)
    setError('')
    try {
      const [usersData, groupsData] = await Promise.all([
        api.admin.getUsers({ date: usersDate }),
        api.admin.getGroups()
      ])
      setUsers(usersData)
      setGroups(groupsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setUsersLoading(false)
    }
  }, [usersDate])

  const fetchApplications = useCallback(async () => {
    const isCalendar = appsViewMode === 'calendar' && calendarUserId
    if (appsViewMode === 'calendar' && !calendarUserId) {
      setApplications([])
      setTotalItems(0)
      return
    }
    setAppsLoading(true)
    setError('')
    try {
      const params = isCalendar
        ? (() => {
            const { from, to } = getBangkokDayRange(calendarDate)
            return {
              user_id: calendarUserId,
              from,
              to,
              page: currentPage,
              page_size: pageSize
            }
          })()
        : {
            user_id: selectedUser?.id || undefined,
            search: search || undefined,
            platform: filterPlatform || undefined,
            job_type: filterJobType || undefined,
            work_type: filterWorkType || undefined,
            page: currentPage,
            page_size: pageSize
          }
      const data = await api.admin.getApplications(params)
      setApplications(data.items || [])
      setTotalItems(data.total || 0)
      setCurrentPage((prev) => (data.total_pages && prev > data.total_pages ? data.total_pages : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setAppsLoading(false)
    }
  }, [appsViewMode, calendarDate, calendarUserId, selectedUser, search, filterPlatform, filterJobType, filterWorkType, currentPage, pageSize])

  useEffect(() => {
    fetchUsersAndGroups()
  }, [fetchUsersAndGroups])

  useEffect(() => {
    if (view === 'applications') fetchApplications()
  }, [view, fetchApplications])

  useEffect(() => {
    if (view === 'applications' && appsViewMode === 'calendar' && selectedUser && !calendarUserId) {
      setCalendarUserId(selectedUser.id)
    }
  }, [view, appsViewMode, selectedUser, calendarUserId])

  const openUserApplications = (user) => {
    setSelectedUser(user)
    setCalendarUserId(user.id)
    setSearch('')
    setFilterPlatform('')
    setFilterJobType('')
    setCurrentPage(1)
    setView('applications')
  }

  const backToUsers = () => {
    setSelectedUser(null)
    setCurrentPage(1)
    setView('users')
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIdx = totalItems === 0 ? 0 : ((currentPageSafe - 1) * pageSize) + 1
  const endIdx = Math.min(currentPageSafe * pageSize, totalItems)

  useEffect(() => {
    setPageInputVal(String(currentPageSafe))
  }, [currentPageSafe])

  const resetPage = () => setCurrentPage(1)

  const nameMatchesSearch = (u) => {
    if (!searchName.trim()) return true
    const q = searchName.trim().toLowerCase()
    return (u.name || '').toLowerCase().includes(q)
  }
  const filteredUsers = users.filter(nameMatchesSearch)

  const filteredGroups = groupFilter === ''
    ? groups
    : groupFilter === 'ungrouped'
      ? []
      : groups.filter((g) => g.id === groupFilter)

  const ungroupedUsers = filteredUsers.filter((u) => !(u.group_ids || []).length)
  const showUngrouped = groupFilter === '' || groupFilter === 'ungrouped'

  const toggleGroup = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleCreateGroup = async (name, selectedUserIds = []) => {
    const created = await api.admin.createGroup(name)
    for (const userId of selectedUserIds) {
      await api.admin.addGroupMember(created.id, userId)
    }
    const [usersData, groupsData] = await Promise.all([
      api.admin.getUsers({ date: usersDate }),
      api.admin.getGroups()
    ])
    setUsers(usersData)
    setGroups(groupsData)
    if (created?.id) setExpandedGroupIds((prev) => new Set([...prev, created.id]))
  }

  const handleApplyGroupChanges = async (groupId, { adds, removes }) => {
    for (const userId of removes) {
      await api.admin.removeGroupMember(groupId, userId)
    }
    for (const userId of adds) {
      await api.admin.addGroupMember(groupId, userId)
    }
    await fetchUsersAndGroups()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader
        icon="shield"
        iconVariant="amber"
        title="Admin Dashboard"
        subtitle="Job Tracker"
        onSignOut={handleSignOut}
        links={[
          { to: '/dashboard', label: 'My Dashboard', icon: Briefcase },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        {view === 'users' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Users by Group</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Search by name..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 w-48"
                    />
                  </div>
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-600 min-w-[140px]"
                  >
                    <option value="">All users</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    <option value="ungrouped">Ungrouped only</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={usersDate}
                  onChange={(e) => setUsersDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
                />
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg border border-amber-700/50 hover:bg-amber-950/30 transition-colors"
                >
                  <Plus size={12} />
                  Create group
                </button>
                <button
                  onClick={fetchUsersAndGroups}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw size={12} className={usersLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {showCreateGroup && (
              <CreateGroupModal
                onClose={() => setShowCreateGroup(false)}
                onSubmit={handleCreateGroup}
                users={users}
              />
            )}

            {groupSettingsGroup && (
              <GroupSettingsModal
                group={groups.find((g) => g.id === groupSettingsGroup.id) || groupSettingsGroup}
                users={users}
                userById={Object.fromEntries(users.map((u) => [u.id, u]))}
                onClose={() => setGroupSettingsGroup(null)}
                onApplyChanges={handleApplyGroupChanges}
              />
            )}

            {usersLoading ? (
              <LoadingSpinner />
            ) : users.length === 0 ? (
              <EmptyState icon={Users} title="No users found" />
            ) : filteredUsers.length === 0 ? (
              <EmptyState icon={Users} title="No users match your filters" />
            ) : (
              <UsersByGroupAccordion
                users={filteredUsers}
                groups={filteredGroups}
                expandedGroupIds={expandedGroupIds}
                onToggleGroup={toggleGroup}
                onView={openUserApplications}
                onOpenGroupSettings={setGroupSettingsGroup}
                showUngrouped={showUngrouped}
              />
            )}
          </>
        )}

        {view === 'applications' && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={backToUsers}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                  Users
                </button>
                <span className="text-gray-700">/</span>
                <h2 className="text-sm font-semibold text-white">
                  {appsViewMode === 'list'
                    ? (selectedUser ? selectedUser.name : 'All Applications')
                    : (calendarUserId ? (users.find((u) => u.id === calendarUserId)?.name || 'Applications') : 'Calendar')}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <ViewModeToggle
                  mode={appsViewMode}
                  onModeChange={setAppsViewMode}
                  onCalendarSelect={() => setCurrentPage(1)}
                />
                <button
                  onClick={fetchApplications}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw size={12} className={appsLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {appsViewMode === 'calendar' && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="admin-calendar-user" className="text-sm text-gray-400">User:</label>
                  <select
                    id="admin-calendar-user"
                    value={calendarUserId}
                    onChange={(e) => { setCalendarUserId(e.target.value); setCurrentPage(1) }}
                    className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-600 min-w-[180px]"
                  >
                    <option value="">Select user</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.id} ({u.application_count ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="admin-calendar-day" className="text-sm text-gray-400">Date (Bangkok):</label>
                  <input
                    id="admin-calendar-day"
                    type="date"
                    value={calendarDate}
                    onChange={(e) => { setCalendarDate(e.target.value); setCurrentPage(1) }}
                    className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
                  />
                </div>
              </div>
            )}

            {appsViewMode === 'list' && (
              <ApplicationFilters
                search={search}
                onSearchChange={(e) => { setSearch(e.target.value); resetPage() }}
                filterPlatform={filterPlatform}
                onPlatformChange={(e) => { setFilterPlatform(e.target.value); resetPage() }}
                filterJobType={filterJobType}
                onJobTypeChange={(e) => { setFilterJobType(e.target.value); resetPage() }}
                filterWorkType={filterWorkType}
                onWorkTypeChange={(e) => { setFilterWorkType(e.target.value); resetPage() }}
              />
            )}

            {appsViewMode === 'calendar' && !calendarUserId ? (
              <EmptyState
                icon={Calendar}
                title="Select a user and date to view applications for that day"
              />
            ) : appsLoading ? (
              <LoadingSpinner />
            ) : totalItems === 0 ? (
              <EmptyState
                icon={Briefcase}
                title={appsViewMode === 'calendar' ? `No applications on ${calendarDate}` : 'No applications found'}
              />
            ) : (
              <ApplicationsTable
                applications={applications}
                showUserColumn={appsViewMode === 'list' && !selectedUser}
                pagination={
                  <Pagination
                    startIdx={startIdx}
                    endIdx={endIdx}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    currentPage={currentPageSafe}
                    pageSize={pageSize}
                    pageInputVal={pageInputVal}
                    onPageInputChange={(e) => setPageInputVal(e.target.value)}
                    onPageInputBlur={() => {
                      const n = Math.max(1, Math.min(totalPages, parseInt(pageInputVal, 10) || 1))
                      setCurrentPage(n)
                      setPageInputVal(String(n))
                    }}
                    onPageInputKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1) }}
                    suffix={appsViewMode === 'calendar' ? ` on ${calendarDate}` : ''}
                  />
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
