import supabase from './supabase.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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
  getStats: (params = {}) => {
    const qs = buildQs(params)
    return request(`/api/applications/stats${qs ? `?${qs}` : ''}`)
  },
  createApplication: (data) =>
    request('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
  deleteApplication: (id) =>
    request(`/api/applications/${id}`, { method: 'DELETE' }),
  getResumeDownloadUrl: (applicationId) =>
    request(`/api/applications/${applicationId}/resume-url`),

  profiles: {
    getProfiles: () => request('/api/profiles'),
    createProfile: (name) =>
      request('/api/profiles', { method: 'POST', body: JSON.stringify({ name }) }),
    updateProfile: (id, name) =>
      request(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    deleteProfile: (id) =>
      request(`/api/profiles/${id}`, { method: 'DELETE' }),
  },

  team: {
    getRequests: () => request('/api/team/requests'),
    getTeammates: () => request('/api/team/teammates'),
    getApplications: (params = {}) => {
      const qs = buildQs(params)
      return request(`/api/team/applications${qs ? `?${qs}` : ''}`)
    },
    sendRequest: (email) =>
      request('/api/team/requests', { method: 'POST', body: JSON.stringify({ email }) }),
    respondRequest: (id, action) =>
      request(`/api/team/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }),
  },

  admin: {
    getApplications: (params = {}) => {
      const qs = buildQs(params)
      return request(`/api/admin/applications${qs ? `?${qs}` : ''}`)
    },
    getUsers: (params = {}) => {
      const qs = buildQs(params)
      return request(`/api/admin/users${qs ? `?${qs}` : ''}`)
    },
    getGroups: () => request('/api/admin/groups'),
    createGroup: (name) =>
      request('/api/admin/groups', { method: 'POST', body: JSON.stringify({ name }) }),
    updateGroup: (id, name) =>
      request(`/api/admin/groups/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    deleteGroup: (id) =>
      request(`/api/admin/groups/${id}`, { method: 'DELETE' }),
    addGroupMember: (groupId, userId) =>
      request(`/api/admin/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    removeGroupMember: (groupId, userId) =>
      request(`/api/admin/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  },
}
