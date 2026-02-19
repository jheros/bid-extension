import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Trash2, ExternalLink, Search, RefreshCw, Briefcase, ShieldCheck, Users2 } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'

const PLATFORMS = ['greenhouse', 'lever', 'workday', 'linkedin', 'indeed', 'smartrecruiters', 'jobvite', 'icims', 'workable', 'ashbyhq', 'other']
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']
const WORK_TYPES = ['Remote', 'Hybrid', 'Onsite']

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function PlatformBadge({ platform }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300 capitalize">
      {platform || 'other'}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterJobType, setFilterJobType] = useState('')
  const [filterWorkType, setFilterWorkType] = useState('')

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

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await api.getStats()
      setStats(data)
    } catch {
      // non-critical
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getApplications({
        search: search || undefined,
        platform: filterPlatform || undefined,
        job_type: filterJobType || undefined,
        work_type: filterWorkType || undefined
      })
      setApplications(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, filterPlatform, filterJobType, filterWorkType])

  useEffect(() => {
    fetchApplications()
    fetchStats()
  }, [fetchApplications, fetchStats])

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return
    setDeletingId(id)
    try {
      await api.deleteApplication(id)
      setApplications((prev) => prev.filter((a) => a.id !== id))
      fetchStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  const topPlatforms = (bucket) => {
    if (!bucket?.byPlatform) return []
    return Object.entries(bucket.byPlatform)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white leading-none">Job Tracker</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {profile?.name ? `${profile.name} · ${user?.email}` : user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/team"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <Users2 size={15} />
              Team
            </Link>
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
              >
                <ShieldCheck size={15} />
                Admin
              </Link>
            )}
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Applications (08:00 GMT+7 cutoff)
            </h2>
            <button
              onClick={() => { fetchStats(); fetchApplications() }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={12} className={statsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Today"
              value={statsLoading ? '—' : (stats?.day?.total ?? 0)}
              sub={topPlatforms(stats?.day).map(([p, n]) => `${p}: ${n}`).join(' · ') || undefined}
            />
            <StatCard
              label="This Week"
              value={statsLoading ? '—' : (stats?.week?.total ?? 0)}
              sub={topPlatforms(stats?.week).map(([p, n]) => `${p}: ${n}`).join(' · ') || undefined}
            />
            <StatCard
              label="This Month"
              value={statsLoading ? '—' : (stats?.month?.total ?? 0)}
              sub={topPlatforms(stats?.month).map(([p, n]) => `${p}: ${n}`).join(' · ') || undefined}
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, company, location..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
            </div>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
            <select
              value={filterJobType}
              onChange={(e) => setFilterJobType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="">All job types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="">All work types</option>
              {WORK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">
              {loading ? 'Loading...' : `${applications.length} application${applications.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
              <Briefcase size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No applications found</p>
              <p className="text-gray-600 text-xs mt-1">
                Use the browser extension to start tracking jobs
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
                      <th className="px-4 py-3"></th>
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
                            {app.job_type && (
                              <span className="text-xs text-gray-400">{app.job_type}</span>
                            )}
                            {app.work_type && (
                              <span className="text-xs text-gray-500">{app.work_type}</span>
                            )}
                            {!app.job_type && !app.work_type && (
                              <span className="text-xs text-gray-600">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PlatformBadge platform={app.platform} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {app.salary || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(app.id)}
                            disabled={deletingId === app.id}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/50 transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
