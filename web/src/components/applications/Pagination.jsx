import { ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({
  startIdx,
  endIdx,
  totalItems,
  totalPages,
  currentPage,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  pageInputVal,
  onPageInputChange,
  onPageInputBlur,
  onPageInputKeyDown,
  onPageChange,
  onPageSizeChange,
  suffix,
  variant = 'full',
}) {
  if (variant === 'simple') {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-400">
        <p>Showing {startIdx}-{endIdx} of {totalItems}{suffix}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {currentPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-400 flex-wrap gap-2">
      <p>
        Showing {startIdx}-{endIdx} of {totalItems}
        {suffix}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
            title="First page"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInputVal}
              onChange={onPageInputChange}
              onBlur={onPageInputBlur}
              onKeyDown={onPageInputKeyDown}
              className="w-10 px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-gray-500">/ {totalPages}</span>
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-50"
            title="Last page"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
