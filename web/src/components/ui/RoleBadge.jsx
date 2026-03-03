export default function RoleBadge({ role }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
      role === 'admin'
        ? 'bg-amber-950 text-amber-400 border border-amber-800'
        : 'bg-gray-800 text-gray-400'
    }`}>
      {role}
    </span>
  )
}
