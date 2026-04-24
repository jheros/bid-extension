import { ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react'

function parseField(val) {
  if (!val) return null
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
    return val
  } catch {
    return val
  }
}

function formatSalary(min, max) {
  if (!min && !max) return null
  if (min && max) return `$${min} – $${max}`
  return `$${min || max}`
}

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function MetaRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="text-sm text-gray-200 mt-0.5">{value}</p>
    </div>
  )
}

function AiSection({ title, content }) {
  if (!content) return null
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  )
}

function TrackButton({ job, trackState, onTrack }) {
  if (!job.job_url || !job.title || !job.company_name) return null

  if (trackState === 'tracked') {
    return (
      <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/40 text-green-400 text-sm font-medium border border-green-700/50">
        <BookmarkCheck size={14} />
        Tracked
      </div>
    )
  }

  if (trackState === 'duplicate') {
    return (
      <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 text-gray-500 text-sm border border-gray-700">
        <BookmarkCheck size={14} />
        Already tracked
      </div>
    )
  }

  return (
    <button
      onClick={() => onTrack(job)}
      disabled={trackState === 'loading'}
      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium border border-gray-700 transition-colors disabled:opacity-50"
    >
      <Bookmark size={14} />
      {trackState === 'loading' ? 'Tracking…' : 'Track'}
    </button>
  )
}

export default function JobDetailPanel({ job, isLoading, trackState, onTrack }) {
  if (!job && !isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-center min-h-48 lg:min-h-0 lg:h-full">
        <p className="text-sm text-gray-600">Select a job to view details</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto applications-table-scroll">
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-5 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-gray-800 rounded" />)}
          </div>
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-white leading-snug">{job.title || 'Untitled'}</h2>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-xs border ${
                  job.is_active
                    ? 'bg-green-900/50 text-green-400 border-green-700/50'
                    : 'bg-gray-800 text-gray-500 border-gray-700'
                }`}
              >
                {job.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{job.company_name || '—'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetaRow label="Work Type"   value={parseField(job.work_type)} />
            <MetaRow label="Employment"  value={parseField(job.employment_type)} />
            <MetaRow label="Experience"  value={parseField(job.experience)} />
            <MetaRow label="Salary"      value={formatSalary(job.salary_min, job.salary_max)} />
            <MetaRow label="Location"    value={parseField(job.remote_location)} />
            <MetaRow label="Posted"      value={formatDate(job.posted_date)} />
          </div>

          <AiSection title="Core Responsibilities" content={job.ai_core_responsibilities} />
          <AiSection title="Requirements Summary"  content={job.ai_requirements_summary} />

          <div className="flex gap-2 pt-1">
            {job.job_url && (
              <a
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
              >
                <ExternalLink size={14} />
                Apply
              </a>
            )}
            <TrackButton job={job} trackState={trackState} onTrack={onTrack} />
          </div>
        </>
      )}
    </div>
  )
}
