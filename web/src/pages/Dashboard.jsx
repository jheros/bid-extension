import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Briefcase, ShieldCheck, Users2, RefreshCw } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { getTodayBangkok, getBangkokDayRange } from '../lib/dateUtils.js'
import { PageHeader } from '../components/layout/index.js'
import { StatCard, LoadingSpinner, Alert, EmptyState } from '../components/ui/index.js'
import { ApplicationFilters, ApplicationsTable, Pagination, ViewModeToggle } from '../components/applications/index.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterJobType, setFilterJobType] = useState('')
  const [filterWorkType, setFilterWorkType] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const [viewMode, setViewMode] = useState('list')
  const [calendarDate, setCalendarDate] = useState(() => getTodayBangkok())
  const [pageInputVal, setPageInputVal] = useState('1')

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPageSafe = Math.min(currentPage, totalPages)

  useEffect(() => {
    setPageInputVal(String(currentPageSafe))
  }, [currentPageSafe])

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
      const isCalendar = viewMode === 'calendar'
      const params = isCalendar
        ? (() => {
            const { from, to } = getBangkokDayRange(calendarDate)
            return { from, to, page: currentPage, page_size: pageSize }
          })()
        : {
            search: search || undefined,
            platform: filterPlatform || undefined,
            job_type: filterJobType || undefined,
            work_type: filterWorkType || undefined,
            page: currentPage,
            page_size: pageSize
          }
      const data = await api.getApplications(params)
      setApplications(data.items || [])
      setTotalItems(data.total || 0)
      setCurrentPage((prev) => (data.total_pages && prev > data.total_pages ? data.total_pages : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [viewMode, calendarDate, search, filterPlatform, filterJobType, filterWorkType, currentPage, pageSize])

  useEffect(() => {
    fetchApplications()
    fetchStats()
  }, [fetchApplications, fetchStats])

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return
    setDeletingId(id)
    try {
      await api.deleteApplication(id)
      await fetchApplications()
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

  const allPlatforms = (bucket) => {
    if (!bucket?.byPlatform) return []
    return Object.entries(bucket.byPlatform).sort((a, b) => b[1] - a[1])
  }

  const startIdx = totalItems === 0 ? 0 : ((currentPageSafe - 1) * pageSize) + 1
  const endIdx = Math.min(currentPageSafe * pageSize, totalItems)

  const resetPage = () => setCurrentPage(1)

  const links = [
    { to: '/team', label: 'Team', icon: Users2 },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck, highlight: true }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader
        icon="briefcase"
        title="Job Tracker"
        subtitle={profile?.name ? `${profile.name} · ${user?.email}` : user?.email}
        onSignOut={handleSignOut}
        links={links}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Applications (08:00 GMT+7 cutoff)
            </h2>
            <div className="flex items-center gap-3">
              <ViewModeToggle
                mode={viewMode}
                onModeChange={setViewMode}
                onCalendarSelect={() => setCurrentPage(1)}
              />
              <button
                onClick={() => { fetchStats(); fetchApplications() }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={12} className={statsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
          {viewMode === 'calendar' && (
            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="calendar-day" className="text-sm text-gray-400">Date (Bangkok):</label>
              <input
                id="calendar-day"
                type="date"
                value={calendarDate}
                onChange={(e) => { setCalendarDate(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Today"
              value={statsLoading ? '—' : (stats?.day?.total ?? 0)}
              sub={allPlatforms(stats?.day).map(([p, n]) => `${p}: ${n}`).join(' · ') || undefined}
            />
            <StatCard
              label="This Week"
              value={statsLoading ? '—' : (stats?.week?.total ?? 0)}
              sub={allPlatforms(stats?.week).map(([p, n]) => `${p}: ${n}`).join(' · ') || undefined}
            />
            <StatCard
              label="This Month"
              value={statsLoading ? '—' : (stats?.month?.total ?? 0)}
              sub={allPlatforms(stats?.month).map(([p, n]) => `${p}: ${n}`).join(' · ') || undefined}
            />
          </div>
        </div>

        {viewMode === 'list' && (
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

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">
              {loading
                ? 'Loading...'
                : viewMode === 'calendar'
                  ? `${totalItems} application${totalItems !== 1 ? 's' : ''} on ${calendarDate}`
                  : `${totalItems} application${totalItems !== 1 ? 's' : ''}`}
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}

          {loading ? (
            <LoadingSpinner />
          ) : totalItems === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No applications found"
              subtitle="Use the browser extension to start tracking jobs"
            />
          ) : (
            <ApplicationsTable
              applications={applications}
              showDeleteColumn
              deletingId={deletingId}
              onDelete={handleDelete}
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
                  suffix={viewMode === 'calendar' ? ` on ${calendarDate}` : ''}
                />
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}
