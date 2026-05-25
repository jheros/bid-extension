import { useRef } from 'react'
import { Eye, ExternalLink } from 'lucide-react'

function ScrollCell({ children, className = '' }) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)

  const handleMouseEnter = () => {
    if (!outerRef.current || !innerRef.current) return
    const overflow = innerRef.current.scrollWidth - outerRef.current.clientWidth
    if (overflow <= 0) return
    outerRef.current.style.setProperty('--scroll-dist', `${overflow}px`)
    innerRef.current.classList.add('marquee-active')
  }

  const handleMouseLeave = () => {
    innerRef.current?.classList.remove('marquee-active')
  }

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={innerRef} className="whitespace-nowrap">
        {children}
      </div>
    </div>
  )
}

function parseRemoteLocation(val) {
  if (!val) return '—'
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0]
        .replace(', United States', ', US')
        .replace(', United Kingdom', ', UK')
        .replace(', United Arab Emirates', ', UAE')
    }
    return val
  } catch {
    return val
  }
}

function parseEmploymentType(val) {
  if (!val) return 'Full-time'
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
    return val
  } catch {
    return val || 'Full-time'
  }
}

function formatSalary(min, max) {
  if (!min && !max) return '—'
  if (min && max) return `$${min}–${max}`
  return `$${min || max}`
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isNew(postedDate) {
  if (!postedDate) return false
  return Date.now() - new Date(postedDate).getTime() <= 24 * 60 * 60 * 1000
}

export default function ScrapedJobsTable({ jobs, viewedJobIds, selectedJobId, onJobClick, pagination }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto applications-table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[240px]">Title</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Employment</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Remote</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {jobs.map((job) => {
              const viewed = viewedJobIds.has(job.id)
              const selected = selectedJobId === job.id
              return (
                <tr
                  key={job.id}
                  onClick={() => onJobClick(job)}
                  className={`cursor-pointer transition-colors ${
                    selected
                      ? 'bg-gray-700/60 border-l-2 border-l-blue-500'
                      : viewed
                      ? 'hover:bg-gray-800/40'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <td className="px-4 py-3 min-w-[240px] max-w-[360px]">
                    <div className="flex items-center gap-2">
                      {viewed && <Eye size={12} className="text-gray-600 shrink-0" />}
                      <ScrollCell className="flex-1 min-w-0">
                        {job.job_url ? (
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1 font-medium hover:underline ${
                              viewed ? 'text-gray-500 hover:text-gray-400' : 'text-white hover:text-blue-400'
                            }`}
                          >
                            {job.title || '—'}
                            <ExternalLink size={11} className="shrink-0 opacity-50" />
                          </a>
                        ) : (
                          <span className={`font-medium ${viewed ? 'text-gray-500' : 'text-white'}`}>
                            {job.title || '—'}
                          </span>
                        )}
                      </ScrollCell>
                      {isNew(job.posted_date) && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-green-900/60 text-green-400 text-[10px] font-medium border border-green-700/50">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-[180px]">
                    <ScrollCell>{job.company_name || '—'}</ScrollCell>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700/50">
                      {parseEmploymentType(job.employment_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {parseRemoteLocation(job.remote_location)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {formatSalary(job.salary_min, job.salary_max)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {formatDateShort(job.posted_date)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pagination}
    </div>
  )
}
