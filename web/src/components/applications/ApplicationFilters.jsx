import { Search } from 'lucide-react'
import { PLATFORMS, JOB_TYPES, WORK_TYPES } from '../../constants.js'

export default function ApplicationFilters({
  search,
  onSearchChange,
  filterPlatform,
  onPlatformChange,
  filterJobType,
  onJobTypeChange,
  filterWorkType,
  onWorkTypeChange,
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={onSearchChange}
            placeholder="Search by title, company, location..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
          />
        </div>
        <select
          value={filterPlatform}
          onChange={onPlatformChange}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
        <select
          value={filterJobType}
          onChange={onJobTypeChange}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
        >
          <option value="">All job types</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterWorkType}
          onChange={onWorkTypeChange}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
        >
          <option value="">All work types</option>
          {WORK_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
