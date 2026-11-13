/**
 * JobHopper Admin API Client
 * Talks to job-hopper-backend at VITE_API_URL (.env). There is no offline/demo fallback:
 * failed requests throw, and a 401 clears the session and signs the admin out.
 */
import { API_URL } from '../config'

// Holds { token, email, name }. Renamed from the old jh_admin_token/jh_admin_user keys so
// sessions issued by the removed demo login are not picked up.
const STORAGE_KEY_AUTH = 'jh_admin_auth'

export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export const getStoredAuth = () => {
  try {
    const auth = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH))
    return auth?.token ? auth : null
  } catch {
    return null
  }
}

export const saveAuth = (auth) => {
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth))
}

export const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY_AUTH)
  // Leftovers from the removed demo login.
  localStorage.removeItem('jh_admin_token')
  localStorage.removeItem('jh_admin_user')
  localStorage.removeItem('jh_admin_demo_mode')
  sessionStorage.removeItem('jobhopper-admin-session')
}

export async function apiRequest(endpoint, options = {}) {
  const token = getStoredAuth()?.token

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  // If body is FormData, delete Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  let res
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error(`Cannot reach the JobHopper server at ${API_URL}.`, { cause: err })
  }

  const json = await res.json().catch(() => null)

  // A 401 on an authenticated request means the session is gone; a 401 on login is just bad credentials.
  if (res.status === 401 && token) {
    clearAuth()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  if (!res.ok) {
    const error = new Error(res.status === 403 ? 'Access denied' : errorMessage(json, res.status))
    error.status = res.status
    throw error
  }
  return json
}

// Validation failures (422) come back as `{ error: [{ path: 'body.name', message }] }`.
const errorMessage = (json, status) => {
  if (Array.isArray(json?.error) && json.error.length) {
    return json.error
      .map((e) => (e.path ? `${e.path.replace(/^(body|query|params)\./, '')}: ${e.message}` : e.message))
      .join('; ')
  }
  return json?.message || `Request failed with status ${status}`
}

/**
 * Loads an authorized file (`GET /files/:id/content`) and returns an object URL for <img src>.
 * Private files (ID documents, dispute evidence) need the Bearer token, so a plain URL won't do.
 * The caller must URL.revokeObjectURL() it when done.
 */
export async function apiFileObjectUrl(fileId) {
  const token = getStoredAuth()?.token
  let res
  try {
    res = await fetch(`${API_URL}/files/${fileId}/content`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error(`Cannot reach the JobHopper server at ${API_URL}.`, { cause: err })
  }
  if (res.status === 401 && token) {
    clearAuth()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error(errorMessage(json, res.status))
  }
  return URL.createObjectURL(await res.blob())
}

const PAGE_LIMIT = 100 // backend maximum

/**
 * List endpoints are paginated (`data[key]` + `data.pagination`) and have no text search,
 * so pages that search/filter client-side load every page up front.
 */
export async function apiRequestAll(endpoint, key, params = {}) {
  const items = []
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({ ...params, page, limit: PAGE_LIMIT })
    const res = await apiRequest(`${endpoint}?${query}`)
    if (!Array.isArray(res?.data?.[key])) throw new Error('Unexpected list response from the server. Please try again.')
    items.push(...res.data[key])
    if (page >= (res?.data?.pagination?.totalPages ?? 1)) return items
  }
}

// Total row count for a list query, without loading the rows.
export async function apiCount(endpoint, params = {}) {
  const query = new URLSearchParams({ ...params, page: 1, limit: 1 })
  const res = await apiRequest(`${endpoint}?${query}`)
  return res?.data?.pagination?.total ?? 0
}
