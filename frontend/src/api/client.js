// Single data-access layer for the whole app.
//
// • With no VITE_API_URL, everything runs on the in-browser mock store.
// • Set VITE_API_URL (e.g. http://localhost:8000/api) and every call becomes a REST request:
//
//     GET    {base}/{resource}            -> list
//     GET    {base}/{resource}/{id}       -> get
//     POST   {base}/{resource}            -> create
//     PATCH  {base}/{resource}/{id}       -> update
//     DELETE {base}/{resource}/{id}       -> remove
//     GET    {base}/config/{key}          -> getObject   (permissions, settings)
//     PUT    {base}/config/{key}          -> setObject
//     POST   {base}/auth/login            -> login  { email, password, portal } => { token, user, mfaRequired }
//     POST   {base}/auth/mfa              -> verifyMfa { email, code } => { token, user }
//
// Resource names (camelCase) are listed in backend/src/resources.js and backend/README.md.
import { mockStore, subscribe as mockSubscribe } from './mockStore'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const USING_MOCK = !BASE

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

function token() {
  try { return JSON.parse(sessionStorage.getItem('crewdesk_session'))?.token } catch { return null }
}

async function http(method, path, body) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running and VITE_API_URL is correct.')
  }
  let data = null
  if (res.status !== 204) {
    const text = await res.text()
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  }
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Token missing or expired: clear the session and send the user to the right login page
    let wasCrew = false
    try { wasCrew = JSON.parse(sessionStorage.getItem('crewdesk_session'))?.user?.role === 'Crew Member' } catch { /* ignore */ }
    sessionStorage.removeItem('crewdesk_session')
    if (!window.location.pathname.startsWith('/login')) window.location.href = wasCrew ? '/login?portal=crew' : '/login'
    throw new Error('Session expired')
  }
  if (!res.ok) throw new Error(data?.error || res.statusText || 'Request failed')
  return data
}

// Remote change listeners (refetch after our own mutations when using the real API).
// '*' means "something changed server-side (e.g. a multi-table business rule) – refresh everything".
const CASCADES = ['assignments', 'signOns', 'signOffs', 'vacancies'] // server updates other tables too
const remoteListeners = new Set()
const remoteEmit = (r) => remoteListeners.forEach((fn) => fn(r))

export const api = {
  async list(resource, query = {}) {
    if (USING_MOCK) { await delay(); return mockStore.list(resource) }
    const qs = new URLSearchParams(query).toString()
    const data = await http('GET', `/${resource}${qs ? `?${qs}` : ''}`)
    return Array.isArray(data) ? data : data.data || data.items || []
  },
  async get(resource, id) {
    if (USING_MOCK) { await delay(60); return mockStore.get(resource, id) }
    return http('GET', `/${resource}/${id}`)
  },
  async create(resource, data) {
    if (USING_MOCK) { await delay(); return mockStore.create(resource, data) }
    const r = await http('POST', `/${resource}`, data); remoteEmit(CASCADES.includes(resource) ? '*' : resource); return r
  },
  async update(resource, id, patch) {
    if (USING_MOCK) { await delay(); return mockStore.update(resource, id, patch) }
    const r = await http('PATCH', `/${resource}/${id}`, patch); remoteEmit(CASCADES.includes(resource) ? '*' : resource); return r
  },
  async remove(resource, id) {
    if (USING_MOCK) { await delay(); return mockStore.remove(resource, id) }
    const r = await http('DELETE', `/${resource}/${id}`); remoteEmit(resource); return r
  },
  // POST to a custom action endpoint, e.g. api.post('/applications/APP-0001/onboard')
  async post(path, body) {
    if (USING_MOCK) throw new Error('Not available in demo mode')
    const r = await http('POST', path, body); remoteEmit('*'); return r
  },
  async getObject(key) {
    if (USING_MOCK) { await delay(40); return mockStore.getObject(key) }
    return http('GET', `/config/${key}`)
  },
  async setObject(key, value) {
    if (USING_MOCK) { await delay(); return mockStore.setObject(key, value) }
    const r = await http('PUT', `/config/${key}`, value); remoteEmit(key); return r
  },

  // ---- Auth ----
  async login({ email, password, portal }) {
    if (!USING_MOCK) return http('POST', '/auth/login', { email, password, portal })
    await delay(300)
    if (!password || password.length < 4) throw new Error('Invalid email or password')
    if (portal === 'crew') {
      const crew = mockStore.list('crew').find((c) => c.email.toLowerCase() === email.toLowerCase() || c.id.toLowerCase() === email.toLowerCase())
      if (!crew) throw new Error('No seafarer with that Crew ID or email')
      mockStore.logEvent('LOGIN', `Crew portal: ${crew.id}`)
      return { token: 'mock-crew-token', user: { id: crew.id, name: `${crew.firstName} ${crew.lastName}`, email: crew.email, role: 'Crew Member', crewId: crew.id } }
    }
    const user = mockStore.list('users').find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) throw new Error('No staff account with that email. Try one of the demo accounts.')
    const settings = mockStore.getObject('settings') || {}
    if (user.mfa || settings.enforceMfa) return { mfaRequired: true, email: user.email, mfaToken: user.email }
    mockStore.logEvent('LOGIN', user.email)
    return { token: 'mock-token', user }
  },
  async verifyMfa({ email, code, mfaToken }) {
    if (!USING_MOCK) return http('POST', '/auth/mfa', { mfaToken, code })
    await delay(250)
    if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code (any 6 digits work in demo mode)')
    const user = mockStore.list('users').find((u) => u.email.toLowerCase() === email.toLowerCase())
    mockStore.logEvent('LOGIN', `${user.email} (MFA)`)
    return { token: 'mock-token', user }
  },
  logout(user) {
    if (USING_MOCK) mockStore.logEvent('LOGOUT', user?.email || '')
    else http('POST', '/auth/logout').catch(() => {})
  },

  // Upload placeholder – returns a fake file reference in mock mode
  async upload(file) {
    if (!USING_MOCK) {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${BASE}/uploads`, { method: 'POST', headers: token() ? { Authorization: `Bearer ${token()}` } : {}, body: fd })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Upload failed')
      return res.json() // { fileName, url }
    }
    await delay(300)
    return { fileName: file.name, url: URL.createObjectURL(file) }
  },

  resetDemoData() { if (USING_MOCK) mockStore.reset() },
}

export function subscribe(fn) {
  if (USING_MOCK) return mockSubscribe(fn)
  remoteListeners.add(fn)
  return () => remoteListeners.delete(fn)
}
