import { Search, X, Eye, EyeOff } from 'lucide-react'

const WORK_TYPE_OPTIONS = [
  { value: '', label: 'All work types' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const SORT_OPTIONS = [
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'title', label: 'Title' },
  { value: 'company_name', label: 'Company' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
]

const selectClass =
  'px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600'
const inputClass =
  'px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600'

export default function JobBoardFilters({
  titleFilter, onTitleChange,
  companyFilter, onCompanyChange,
  locationFilter, onLocationChange,
  workTypeFilter, onWorkTypeChange,
  postedDateFilter, onPostedDateChange,
  sortBy, onSortByChange,
  sortOrder, onSortOrderChange,
  showViewed, onToggleViewed,
  onReset,
  totalResults,
}) {
  const hasFilters = titleFilter || companyFilter || locationFilter || workTypeFilter || postedDateFilter

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={titleFilter}
            onChange={onTitleChange}
            placeholder="Search by title..."
            className={`w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600`}
          />
        </div>
        <input
          type="text"
          value={companyFilter}
          onChange={onCompanyChange}
          placeholder="Company..."
          className={`flex-1 ${inputClass}`}
        />
        <input
          type="text"
          value={locationFilter}
          onChange={onLocationChange}
          placeholder="Location..."
          className={`flex-1 ${inputClass}`}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={workTypeFilter} onChange={onWorkTypeChange} className={selectClass}>
          {WORK_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Posted:</span>
          <input
            type="date"
            value={postedDateFilter}
            onChange={onPostedDateChange}
            className={selectClass}
          />
          {postedDateFilter && (
            <button
              onClick={() => onPostedDateChange({ target: { value: '' } })}
              className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <select value={sortBy} onChange={onSortByChange} className={selectClass}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={sortOrder} onChange={onSortOrderChange} className={selectClass}>
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={onToggleViewed}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
            showViewed
              ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              : 'bg-gray-700 border-gray-600 text-white'
          }`}
        >
          {showViewed ? <EyeOff size={14} /> : <Eye size={14} />}
          {showViewed ? 'Hide viewed' : 'Show viewed'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Found <span className="font-medium text-gray-400">{totalResults.toLocaleString()}</span> jobs
        </p>
        {hasFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={12} />
            Reset filters
          </button>
        )}
      </div>
    </div>
  )
}
