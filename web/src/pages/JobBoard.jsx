import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, ShieldCheck, Users2, RefreshCw } from 'lucide-react'
import supabase from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { PageHeader } from '../components/layout/index.js'
import { LoadingSpinner, Alert, EmptyState } from '../components/ui/index.js'
import { ScrapedJobsTable, JobBoardFilters, JobDetailPanel } from '../components/job-board/index.js'
import Pagination from '../components/applications/Pagination.jsx'

function deduplicateJobs(jobs) {
  const seen = new Set()
  return jobs.filter((job) => {
    const key = `${job.title || ''}|${job.company_name || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function JobBoard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [pageInputVal, setPageInputVal] = useState('1')

  const [titleFilter, setTitleFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('')
  const [postedDateFilter, setPostedDateFilter] = useState('')
  const [sortBy, setSortBy] = useState('posted_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showViewed, setShowViewed] = useState(true)

  const [selectedJobId, setSelectedJobId] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDetailLoading, setJobDetailLoading] = useState(false)
  const [viewedJobIds, setViewedJobIds] = useState(new Set())
  const [trackStates, setTrackStates] = useState({})

  const currentPageSafe = Math.min(currentPage, Math.max(1, totalPages))
  const startIdx = total === 0 ? 0 : (currentPageSafe - 1) * pageSize + 1
  const endIdx = Math.min(currentPageSafe * pageSize, total)

  useEffect(() => { setPageInputVal(String(currentPageSafe)) }, [currentPageSafe])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: p } = await supabase
          .from('users').select('name, role').eq('id', data.user.id).single()
        setProfile(p)
      }
    })
  }, [])

  useEffect(() => {
    api.jobBoard.getViewed()
      .then(({ job_ids }) => setViewedJobIds(new Set(job_ids)))
      .catch(() => {})
  }, [])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.jobBoard.getJobs({
        title: titleFilter || undefined,
        company: companyFilter || undefined,
        location: locationFilter || undefined,
        work_type: workTypeFilter || undefined,
        posted_date: postedDateFilter || undefined,
        sort_by: sortBy,
        order: sortOrder,
        page: currentPage,
        page_size: pageSize,
      })
      setJobs(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
      if (data.total_pages && currentPage > data.total_pages) setCurrentPage(data.total_pages)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [titleFilter, companyFilter, locationFilter, workTypeFilter, postedDateFilter, sortBy, sortOrder, currentPage, pageSize])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const resetPage = () => setCurrentPage(1)

  const handleJobClick = useCallback(async (job) => {
    setSelectedJobId(job.id)
    setSelectedJob(job)
    setJobDetailLoading(true)

    if (!viewedJobIds.has(job.id)) {
      setViewedJobIds((prev) => new Set([...prev, job.id]))
      api.jobBoard.markViewed(job.id).catch(() => {})
    }

    try {
      const full = await api.jobBoard.getJob(job.id)
      setSelectedJob(full)
    } catch {
      // keep partial data already in state
    } finally {
      setJobDetailLoading(false)
    }
  }, [viewedJobIds])

  const handleTrackJob = useCallback(async (job) => {
    setTrackStates((prev) => ({ ...prev, [job.id]: 'loading' }))
    try {
      let location = job.location || job.remote_location
      try {
        const p = JSON.parse(location)
        if (Array.isArray(p) && p.length > 0) location = p[0]
      } catch {}

      let workType = job.work_type
      try {
        const p = JSON.parse(workType)
        if (Array.isArray(p) && p.length > 0) workType = p[0]
      } catch {}

      await api.createApplication({
        job_title: job.title,
        company: job.company_name,
        location: location || null,
        work_type: workType || null,
        url: job.job_url,
        platform: 'other',
        salary: [job.salary_min, job.salary_max].filter(Boolean).join(' – ') || null,
      })
      setTrackStates((prev) => ({ ...prev, [job.id]: 'tracked' }))
    } catch (err) {
      setTrackStates((prev) => ({
        ...prev,
        [job.id]: err.message === 'DUPLICATE_APPLICATION' ? 'duplicate' : 'idle',
      }))
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: Briefcase },
    { to: '/team', label: 'Team', icon: Users2 },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck, highlight: true }] : []),
  ]

  const dedupedJobs = deduplicateJobs(jobs)
  const displayJobs = showViewed ? dedupedJobs : dedupedJobs.filter((j) => !viewedJobIds.has(j.id))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader
        icon="briefcase"
        title="Job Board"
        subtitle={profile?.name ? `${profile.name} · ${user?.email}` : user?.email}
        onSignOut={handleSignOut}
        links={links}
      />

      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Scraped Jobs
          </h2>
          <button
            onClick={fetchJobs}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <JobBoardFilters
          titleFilter={titleFilter}
          onTitleChange={(e) => { setTitleFilter(e.target.value); resetPage() }}
          companyFilter={companyFilter}
          onCompanyChange={(e) => { setCompanyFilter(e.target.value); resetPage() }}
          locationFilter={locationFilter}
          onLocationChange={(e) => { setLocationFilter(e.target.value); resetPage() }}
          workTypeFilter={workTypeFilter}
          onWorkTypeChange={(e) => { setWorkTypeFilter(e.target.value); resetPage() }}
          postedDateFilter={postedDateFilter}
          onPostedDateChange={(e) => { setPostedDateFilter(e.target.value); resetPage() }}
          sortBy={sortBy}
          onSortByChange={(e) => { setSortBy(e.target.value); resetPage() }}
          sortOrder={sortOrder}
          onSortOrderChange={(e) => { setSortOrder(e.target.value); resetPage() }}
          showViewed={showViewed}
          onToggleViewed={() => setShowViewed((v) => !v)}
          onReset={() => {
            setTitleFilter(''); setCompanyFilter(''); setLocationFilter('')
            setWorkTypeFilter(''); setPostedDateFilter('')
            setSortBy('posted_date'); setSortOrder('desc')
            resetPage()
          }}
          totalResults={total}
        />

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-5">
            {loading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
                <LoadingSpinner />
              </div>
            ) : displayJobs.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
                <EmptyState
                  icon={Briefcase}
                  title="No jobs found"
                  subtitle="Try adjusting your filters or check back after the next scrape."
                />
              </div>
            ) : (
              <ScrapedJobsTable
                jobs={displayJobs}
                viewedJobIds={viewedJobIds}
                selectedJobId={selectedJobId}
                onJobClick={handleJobClick}
                pagination={
                  total > 0 && (
                    <Pagination
                      startIdx={startIdx}
                      endIdx={endIdx}
                      totalItems={total}
                      totalPages={totalPages}
                      currentPage={currentPageSafe}
                      pageSize={pageSize}
                      pageSizeOptions={[25, 50, 100, 200]}
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
                    />
                  )
                }
              />
            )}
          </div>

          <div className="lg:col-span-2">
            <JobDetailPanel
              job={selectedJob}
              isLoading={jobDetailLoading}
              trackState={trackStates[selectedJobId] || 'idle'}
              onTrack={handleTrackJob}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
