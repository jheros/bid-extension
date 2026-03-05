import { Link } from 'react-router-dom'
import { LogOut, Briefcase, ShieldCheck, Users2, Settings } from 'lucide-react'

const ICONS = {
  briefcase: Briefcase,
  shield: ShieldCheck,
  users: Users2,
}

export default function PageHeader({
  icon = 'briefcase',
  iconVariant = 'default',
  title,
  subtitle,
  onSignOut,
  onSettingsClick,
  links = [],
}) {
  const IconComponent = ICONS[icon] || Briefcase
  const iconBgClass = iconVariant === 'amber' ? 'bg-amber-900/50' : 'bg-gray-800'
  const iconColorClass = iconVariant === 'amber' ? 'text-amber-400' : 'text-white'

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${iconBgClass} flex items-center justify-center`}>
            <IconComponent size={16} className={iconColorClass} />
          </div>
          <div>
            <h1 className="font-semibold text-white leading-none">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  link.highlight
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {Icon && <Icon size={15} />}
                {link.label}
              </Link>
            )
          })}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"
              title="Settings"
            >
              <Settings size={15} />
              Settings
            </button>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
