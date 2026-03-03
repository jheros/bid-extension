import { List, Calendar } from 'lucide-react'

export default function ViewModeToggle({ mode, onModeChange, onCalendarSelect }) {
  return (
    <div className="flex rounded-lg bg-gray-900 border border-gray-800 p-0.5">
      <button
        type="button"
        onClick={() => onModeChange('list')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
          mode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        <List size={14} />
        List
      </button>
      <button
        type="button"
        onClick={() => {
          onModeChange('calendar')
          onCalendarSelect?.()
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
          mode === 'calendar' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        <Calendar size={14} />
        Calendar
      </button>
    </div>
  )
}
