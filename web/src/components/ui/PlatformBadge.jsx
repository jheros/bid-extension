const PLATFORM_STYLES = {
  greenhouse: 'bg-emerald-900/70 text-emerald-300 border border-emerald-700/50',
  lever: 'bg-amber-900/70 text-amber-300 border border-amber-700/50',
  workday: 'bg-sky-900/70 text-sky-300 border border-sky-700/50',
  linkedin: 'bg-blue-900/70 text-blue-300 border border-blue-700/50',
  indeed: 'bg-violet-900/70 text-violet-300 border border-violet-700/50',
  smartrecruiters: 'bg-rose-900/70 text-rose-300 border border-rose-700/50',
  jobvite: 'bg-teal-900/70 text-teal-300 border border-teal-700/50',
  icims: 'bg-orange-900/70 text-orange-300 border border-orange-700/50',
  workable: 'bg-fuchsia-900/70 text-fuchsia-300 border border-fuchsia-700/50',
  ashbyhq: 'bg-lime-900/70 text-lime-300 border border-lime-700/50',
  other: 'bg-gray-800 text-gray-400 border border-gray-700/50'
}

export default function PlatformBadge({ platform }) {
  const key = (platform || 'other').toLowerCase()
  const style = PLATFORM_STYLES[key] || PLATFORM_STYLES.other
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs capitalize border ${style}`}>
      {platform || 'other'}
    </span>
  )
}
