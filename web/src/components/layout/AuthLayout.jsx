import { Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-800 mb-4">
            <Briefcase className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-white">Job Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {children}
        </div>

        {footer && (
          <p className="text-center text-gray-500 text-sm mt-4">
            {footer.text}{' '}
            <Link
              to={footer.to}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              {footer.linkText}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
