import { apiRequest, saveAuth, clearAuth, getStoredAuth } from '../api/client'

export const getAdminSession = getStoredAuth

export const adminLogin = async (email, password) => {
  const res = await apiRequest('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  })

  const token = res?.data?.token
  const admin = res?.data?.admin
  if (!token || !admin) throw new Error('Unexpected response from the server. Please try again.')

  const session = {
    token,
    email: admin.email,
    name: admin.fullName || admin.email.split('@')[0],
  }
  saveAuth(session)
  return session
}

export const adminLogout = () => {
  clearAuth()
}
