import { ExternalLink, Trash2 } from 'lucide-react'
import PlatformBadge from '../ui/PlatformBadge.jsx'

const BANGKOK = { timeZone: 'Asia/Bangkok' }

function DateCell({ appliedAt }) {
  const d = new Date(appliedAt)
  const dateStr = d.toLocaleDateString('en-CA', { ...BANGKOK, year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/')
  const timeStr = d.toLocaleTimeString('en-GB', { ...BANGKOK, hour: '2-digit', minute: '2-digit', hour12: false })
  return (
    <div className="flex flex-col items-center">
      <span className="text-gray-400">{dateStr}</span>
      <span className="text-gray-500 text-xs text-center">{timeStr}</span>
    </div>
  )
}

function ResumeCell({ resume }) {
  if (!resume) return <span>—</span>
  if (/^https?:\/\//i.test(resume)) {
    return (
      <a
        href={resume}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-white truncate block"
      >
        {resume}
      </a>
    )
  }
  return <span>{resume}</span>
}

function TypeCell({ jobType, workType }) {
  if (!jobType && !workType) return <span className="text-xs text-gray-600">—</span>
  return (
    <div className="flex flex-col gap-1">
      {jobType && <span className="text-xs text-gray-400">{jobType}</span>}
      {workType && <span className="text-xs text-gray-500">{workType}</span>}
    </div>
  )
}

export default function ApplicationsTable({
  applications,
  showUserColumn = false,
  showDeleteColumn = false,
  deletingId,
  onDelete,
  pagination,
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto applications-table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              {showUserColumn && (
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
              )}
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[280px]">Job</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Location</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Resume</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</th>
              {showDeleteColumn && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <DateCell appliedAt={app.applied_at} />
                </td>
                {showUserColumn && (
                  <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                    {app.user_name || '—'}
                  </td>
                )}
                <td className="px-4 py-3 min-w-[280px] max-w-[400px]">
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
                  <TypeCell jobType={app.job_type} workType={app.work_type} />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {app.salary || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">
                  <ResumeCell resume={app.resume} />
                </td>
                <td className="px-4 py-3">
                  <PlatformBadge platform={app.platform} />
                </td>
                {showDeleteColumn && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(app.id)}
                      disabled={deletingId === app.id}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/50 transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination}
    </div>
  )
}
