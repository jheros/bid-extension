import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import supabase from '../lib/supabase.js'

export default function AdminRoute({ children }) {
  const [state, setState] = useState('loading') // 'loading' | 'allowed' | 'denied' | 'unauthenticated'

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setState('unauthenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      setState(profile?.role === 'admin' ? 'allowed' : 'denied')
    }
    check()
  }, [])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'unauthenticated') return <Navigate to="/signin" replace />
  if (state === 'denied') return <Navigate to="/dashboard" replace />
  return children
}
