export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
      {Icon && <Icon size={32} className="text-gray-700 mx-auto mb-3" />}
      <p className="text-gray-500 text-sm">{title}</p>
      {subtitle && <p className="text-gray-600 text-xs mt-1">{subtitle}</p>}
    </div>
  )
}
