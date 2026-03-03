import { ExternalLink, Trash2 } from 'lucide-react'
import PlatformBadge from '../ui/PlatformBadge.jsx'

const DATE_FORMAT = {
  timeZone: 'Asia/Bangkok',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

const DATE_FORMAT_SHORT = {
  timeZone: 'Asia/Bangkok',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
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
  dateFormat = 'full',
  pagination,
}) {
  const dateOpts = dateFormat === 'short' ? DATE_FORMAT_SHORT : DATE_FORMAT

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              {showUserColumn && (
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
              )}
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Location</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Resume</th>
              {showDeleteColumn && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {new Date(app.applied_at).toLocaleString('en-GB', dateOpts)}
                </td>
                {showUserColumn && (
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
                  <TypeCell jobType={app.job_type} workType={app.work_type} />
                </td>
                <td className="px-4 py-3">
                  <PlatformBadge platform={app.platform} />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {app.salary || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">
                  <ResumeCell resume={app.resume} />
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
