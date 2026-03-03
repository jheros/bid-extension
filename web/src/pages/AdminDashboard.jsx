import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Briefcase, LogOut, ShieldCheck, Users, RefreshCw, ChevronLeft, Calendar, List
} from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { getTodayBangkok, getBangkokDayRange } from '../lib/dateUtils.js'
import { PageHeader } from '../components/layout/index.js'
import { RoleBadge, LoadingSpinner, Alert, EmptyState } from '../components/ui/index.js'
import {
  ApplicationFilters,
  ApplicationsTable,
  Pagination,
  ViewModeToggle,
} from '../components/applications/index.js'
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [view, setView] = useState('users')
  const [selectedUser, setSelectedUser] = useState(null)

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    setError('')
    try {
      const data = await api.admin.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUsersLoading(false)
    }
  }, [])

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
    fetchUsers()
  }, [fetchUsers])

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">All Users</h2>
              </div>
              <button
                onClick={fetchUsers}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={12} className={usersLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {usersLoading ? (
              <LoadingSpinner />
            ) : users.length === 0 ? (
              <EmptyState icon={Users} title="No users found" />
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Applications</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                          <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                          <td className="px-4 py-3 text-gray-300">{u.application_count}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openUserApplications(u)}
                              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              View applications
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
