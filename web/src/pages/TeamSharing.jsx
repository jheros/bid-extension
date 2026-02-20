import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Check, ExternalLink, LogOut, MailPlus, RefreshCw, Search, ShieldCheck, Users2, X } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'

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

export default function TeamSharing() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [teamEmail, setTeamEmail] = useState('')
  const [teamRequests, setTeamRequests] = useState({ incoming: [], outgoing: [], connections: [] })
  const [teammates, setTeammates] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')

  const [applications, setApplications] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [loadingApps, setLoadingApps] = useState(true)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterJobType, setFilterJobType] = useState('')
  const [filterWorkType, setFilterWorkType] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', data.user.id)
          .single()
        setProfile(p)
      }
    })
  }, [])

  const selectedTeammate = useMemo(
    () => teammates.find((t) => t.id === selectedUserId) || null,
    [teammates, selectedUserId]
  )

  const fetchTeamData = useCallback(async () => {
    setLoadingTeam(true)
    setError('')
    try {
      const [requests, teammateList] = await Promise.all([
        api.team.getRequests(),
        api.team.getTeammates()
      ])

      setTeamRequests({
        incoming: requests.incoming || [],
        outgoing: requests.outgoing || [],
        connections: requests.connections || []
      })
      setTeammates(teammateList || [])

      if (!selectedUserId && teammateList?.length) {
        setSelectedUserId(teammateList[0].id)
      } else if (selectedUserId && teammateList?.every((t) => t.id !== selectedUserId)) {
        setSelectedUserId(teammateList[0]?.id || '')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTeam(false)
    }
  }, [selectedUserId])

  const fetchTeammateApplications = useCallback(async () => {
    if (!selectedUserId) {
      setApplications([])
      setTotalItems(0)
      setLoadingApps(false)
      return
    }

    setLoadingApps(true)
    setError('')
    try {
      const data = await api.team.getApplications({
        user_id: selectedUserId,
        search: search || undefined,
        platform: filterPlatform || undefined,
        job_type: filterJobType || undefined,
        work_type: filterWorkType || undefined,
        page: currentPage,
        page_size: pageSize
      })
      setApplications(data.items || [])
      setTotalItems(data.total || 0)
      setCurrentPage((prev) => (data.total_pages && prev > data.total_pages ? data.total_pages : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingApps(false)
    }
  }, [selectedUserId, search, filterPlatform, filterJobType, filterWorkType, currentPage, pageSize])

  useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  useEffect(() => {
    fetchTeammateApplications()
  }, [fetchTeammateApplications])

  const handleSendRequest = async () => {
    if (!teamEmail.trim()) return
    setError('')
    setActionLoadingId('send')
    try {
      await api.team.sendRequest(teamEmail.trim())
      setTeamEmail('')
      await fetchTeamData()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRespondRequest = async (requestId, action) => {
    setError('')
    setActionLoadingId(requestId)
    try {
      await api.team.respondRequest(requestId, action)
      await fetchTeamData()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIdx = totalItems === 0 ? 0 : ((currentPageSafe - 1) * pageSize) + 1
  const endIdx = Math.min(currentPageSafe * pageSize, totalItems)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
              <Users2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white leading-none">Team Sharing</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {profile?.name ? `${profile.name} · ${user?.email}` : user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
              >
                <ShieldCheck size={15} />
                Admin
              </Link>
            )}
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <Briefcase size={15} />
              Dashboard
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

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Requests</h2>
            <button
              onClick={fetchTeamData}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={12} className={loadingTeam ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={teamEmail}
              onChange={(e) => setTeamEmail(e.target.value)}
              placeholder="Enter teammate email"
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
            />
            <button
              onClick={handleSendRequest}
              disabled={!teamEmail.trim() || actionLoadingId === 'send'}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MailPlus size={14} />
              Request access
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Incoming</p>
              {teamRequests.incoming.length === 0 ? (
                <p className="text-xs text-gray-600">No incoming requests</p>
              ) : (
                <div className="space-y-2">
                  {teamRequests.incoming.map((r) => (
                    <div key={r.id} className="border border-gray-800 rounded-md p-2">
                      <p className="text-sm text-white truncate">{r.counterpart?.name || r.counterpart?.email || 'Unknown user'}</p>
                      <p className="text-xs text-gray-500 truncate">{r.counterpart?.email || ''}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleRespondRequest(r.id, 'accept')}
                          disabled={actionLoadingId === r.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-900/40 text-emerald-300 text-xs hover:bg-emerald-900/60 disabled:opacity-50"
                        >
                          <Check size={12} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespondRequest(r.id, 'deny')}
                          disabled={actionLoadingId === r.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 text-red-300 text-xs hover:bg-red-900/60 disabled:opacity-50"
                        >
                          <X size={12} />
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Outgoing</p>
              {teamRequests.outgoing.length === 0 ? (
                <p className="text-xs text-gray-600">No outgoing requests</p>
              ) : (
                <div className="space-y-2">
                  {teamRequests.outgoing.map((r) => (
                    <div key={r.id} className="border border-gray-800 rounded-md p-2">
                      <p className="text-sm text-white truncate">{r.counterpart?.name || r.counterpart?.email || 'Unknown user'}</p>
                      <p className="text-xs text-gray-500 truncate">{r.counterpart?.email || ''}</p>
                      <p className="text-xs text-gray-600 mt-1">Pending</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Connected</p>
              {teamRequests.connections.length === 0 ? (
                <p className="text-xs text-gray-600">No connected teammates</p>
              ) : (
                <div className="space-y-2">
                  {teamRequests.connections.map((r) => (
                    <div key={r.id} className="border border-gray-800 rounded-md p-2">
                      <p className="text-sm text-white truncate">{r.counterpart?.name || r.counterpart?.email || 'Unknown user'}</p>
                      <p className="text-xs text-gray-500 truncate">{r.counterpart?.email || ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Teammate applications</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
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
              <select
                value={selectedUserId}
                onChange={(e) => { setSelectedUserId(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600 min-w-[240px]"
              >
                {!teammates.length && <option value="">No teammates connected</option>}
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.email || t.id}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchTeammateApplications}
                disabled={!selectedUserId}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={loadingApps ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {selectedTeammate
              ? `Showing applications for ${selectedTeammate.name || selectedTeammate.email || 'selected teammate'}`
              : 'Connect with teammates to view their applications'}
          </p>

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
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={filterJobType}
              onChange={(e) => { setFilterJobType(e.target.value); setCurrentPage(1) }}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="">All job types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filterWorkType}
              onChange={(e) => { setFilterWorkType(e.target.value); setCurrentPage(1) }}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="">All work types</option>
              {WORK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {loadingApps ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-16 bg-gray-950 border border-gray-800 rounded-xl">
              <Briefcase size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {selectedUserId ? 'No applications found' : 'Select a teammate'}
              </p>
            </div>
          ) : (
            <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Location</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                          {new Date(app.applied_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-400">
                <p>
                  Showing {startIdx}-{endIdx} of {totalItems}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPageSafe === 1}
                    className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>Page {currentPageSafe} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPageSafe === totalPages}
                    className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
