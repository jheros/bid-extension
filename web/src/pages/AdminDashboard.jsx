import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Briefcase, LogOut, ShieldCheck, Users, ExternalLink,
  Search, RefreshCw, ChevronLeft, Trash2, Calendar, List, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { getTodayBangkok, getBangkokDayRange } from '../lib/dateUtils.js'

const PLATFORMS = ['greenhouse', 'lever', 'workday', 'linkedin', 'indeed', 'smartrecruiters', 'jobvite', 'icims', 'workable', 'ashbyhq', 'other']
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']
const WORK_TYPES = ['Remote', 'Hybrid', 'Onsite']

function PlatformBadge({ platform }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300 capitalize">
      {platform || 'other'}
    </span>
  )
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
      role === 'admin'
        ? 'bg-amber-950 text-amber-400 border border-amber-800'
        : 'bg-gray-800 text-gray-400'
    }`}>
      {role}
    </span>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [view, setView] = useState('users') // 'users' | 'applications'
  const [selectedUser, setSelectedUser] = useState(null) // { id, name } | null

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)

  const [applications, setApplications] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [appsLoading, setAppsLoading] = useState(false)
  const [error, setError] = useState('')

  // Application filters
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterJobType, setFilterJobType] = useState('')
  const [filterWorkType, setFilterWorkType] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const [appsViewMode, setAppsViewMode] = useState('list') // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(() => getTodayBangkok())
  const [calendarUserId, setCalendarUserId] = useState('') // for calendar: which user's applications
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
    setFilterWorkType('')
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-900/50 flex items-center justify-center">
              <ShieldCheck size={16} className="text-amber-400" />
            </div>
            <div>
              <h1 className="font-semibold text-white leading-none">Admin Dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">Job Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <Briefcase size={15} />
              My Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {view === 'users' && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  All Users
                </h2>
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
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
                <Users size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No users found</p>
              </div>
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
                <div className="flex rounded-lg bg-gray-900 border border-gray-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setAppsViewMode('list')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${appsViewMode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <List size={14} />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAppsViewMode('calendar'); setCurrentPage(1) }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${appsViewMode === 'calendar' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Calendar size={14} />
                    Calendar
                  </button>
                </div>
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

            {/* Filters - list mode only */}
            {appsViewMode === 'list' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                    placeholder="Search by title, company, location..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
                  />
                </div>
                <select
                  value={filterPlatform}
                  onChange={(e) => { setFilterPlatform(e.target.value); setCurrentPage(1) }}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  <option value="">All platforms</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filterJobType}
                  onChange={(e) => { setFilterJobType(e.target.value); setCurrentPage(1) }}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  <option value="">All job types</option>
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={filterWorkType}
                  onChange={(e) => { setFilterWorkType(e.target.value); setCurrentPage(1) }}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  <option value="">All work types</option>
                  {WORK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            )}

            {appsViewMode === 'calendar' && !calendarUserId ? (
              <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
                <Calendar size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a user and date to view applications for that day</p>
              </div>
            ) : appsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
              </div>
            ) : totalItems === 0 ? (
              <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
                <Briefcase size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {appsViewMode === 'calendar' ? `No applications on ${calendarDate}` : 'No applications found'}
                </p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
                  {appsViewMode === 'calendar'
                    ? `${totalItems} application${totalItems !== 1 ? 's' : ''} on ${calendarDate}`
                    : `${totalItems} application${totalItems !== 1 ? 's' : ''}`}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                        {appsViewMode === 'list' && !selectedUser && (
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
                        )}
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Location</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Resume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                            {new Date(app.applied_at).toLocaleString('en-GB', {
                              timeZone: 'Asia/Bangkok',
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          {appsViewMode === 'list' && !selectedUser && (
                            <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                              {app.user_name || '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 max-w-[200px]">
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-white hover:text-gray-300 font-medium group"
                            >
                              <span className="truncate">{app.job_title}</span>
                              <ExternalLink size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{app.company}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{app.location || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {app.job_type && <span className="text-xs text-gray-400">{app.job_type}</span>}
                              {app.work_type && <span className="text-xs text-gray-500">{app.work_type}</span>}
                              {!app.job_type && !app.work_type && <span className="text-xs text-gray-600">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3"><PlatformBadge platform={app.platform} /></td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{app.salary || '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">
                            {app.resume ? (
                              /^https?:\/\//i.test(app.resume) ? (
                                <a href={app.resume} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white truncate block">
                                  {app.resume}
                                </a>
                              ) : (
                                app.resume
                              )
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-400 flex-wrap gap-2">
                  <p>
                    Showing {startIdx}-{endIdx} of {totalItems}
                    {appsViewMode === 'calendar' && ` on ${calendarDate}`}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span>Per page</span>
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                        className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPageSafe === 1}
                        className="p-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
                        title="First page"
                      >
                        <ChevronsLeft size={14} />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPageSafe === 1}
                        className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={pageInputVal}
                          onChange={(e) => setPageInputVal(e.target.value)}
                          onBlur={() => {
                            const n = Math.max(1, Math.min(totalPages, parseInt(pageInputVal, 10) || 1))
                            setCurrentPage(n)
                            setPageInputVal(String(n))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur()
                          }}
                          className="w-10 px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-gray-500">/ {totalPages}</span>
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPageSafe === totalPages}
                        className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPageSafe === totalPages}
                        className="p-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
                        title="Last page"
                      >
                        <ChevronsRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
