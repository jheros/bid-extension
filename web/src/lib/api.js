import supabase from './supabase.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
    ...options.headers
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const body = res.status === 204 ? null : await res.json()

  if (!res.ok) {
    throw new Error(body?.error || `Request failed: ${res.status}`)
  }

  return body
}

const buildQs = (params) =>
  new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()

export const api = {
  getApplications: (params = {}) => {
    const qs = buildQs(params)
    return request(`/api/applications${qs ? `?${qs}` : ''}`)
  },
  getStats: () => request('/api/applications/stats'),
  createApplication: (data) =>
    request('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
  deleteApplication: (id) =>
    request(`/api/applications/${id}`, { method: 'DELETE' }),

  admin: {
    getApplications: (params = {}) => {
      const qs = buildQs(params)
      return request(`/api/admin/applications${qs ? `?${qs}` : ''}`)
    },
    getUsers: () => request('/api/admin/users'),
  },
}
