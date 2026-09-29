import { apiRequest, saveAuth, clearAuth, getStoredAuth } from '../api/client'

const SESSION_KEY = 'jobhopper-admin-session'

export const getAdminSession = () => {
  try {
    const fromStorage = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    if (fromStorage) return fromStorage
    const { user } = getStoredAuth()
    return user ? { email: user.email, name: user.fullName || user.email.split('@')[0], token: user.token } : null
  } catch {
    return null
  }
}

export const adminLogin = async (email, password) => {
  const res = await apiRequest('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  })

  const admin = res?.data?.admin || { email, fullName: email.split('@')[0] }
  const token = res?.data?.token || 'token-' + Date.now()

  const session = {
    email: admin.email,
    name: admin.fullName || admin.email.split('@')[0],
    token,
  }

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    saveAuth(token, session)
  } catch {
    // storage fallback
  }

  return session
}

export const adminLogout = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    clearAuth()
  } catch {
    // clean
  }
}
