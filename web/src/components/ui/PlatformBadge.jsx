export default function PlatformBadge({ platform }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300 capitalize">
      {platform || 'other'}
    </span>
  )
}
