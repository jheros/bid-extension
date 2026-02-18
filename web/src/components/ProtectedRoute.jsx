import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import supabase from '../lib/supabase.js'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return session ? children : <Navigate to="/signin" replace />
}
