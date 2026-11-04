import { apiRequest, saveAuth, clearAuth, getStoredAuth } from '../api/client'

export const getAdminSession = getStoredAuth

const sessionFrom = (token, admin) => ({
  token,
  email: admin.email,
  name: admin.fullName || admin.email.split('@')[0],
})

export const adminLogin = async (email, password) => {
  const res = await apiRequest('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  })

  const token = res?.data?.token
  const admin = res?.data?.admin
  if (!token || !admin) throw new Error('Unexpected response from the server. Please try again.')

  const session = sessionFrom(token, admin)
  saveAuth(session)
  return session
}

export const adminLogout = () => {
  clearAuth()
}

// GET /admin/me — refreshes the stored name/email (they can change after login).
export const fetchAdminProfile = async () => {
  const res = await apiRequest('/admin/me')
  const admin = res?.data?.admin
  const current = getStoredAuth()
  if (!admin || !current) return current
  const session = sessionFrom(current.token, admin)
  saveAuth(session)
  return session
}

// --- Password recovery (no session): email → 5-digit code → reset token (15 min) → new password ---

// The response is the same whether or not the email belongs to an admin.
export const requestPasswordReset = (email) =>
  apiRequest('/admin/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  })

export const verifyResetCode = async (email, code) => {
  const res = await apiRequest('/admin/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  })
  const resetToken = res?.data?.resetToken
  if (!resetToken) throw new Error('Unexpected response from the server. Please try again.')
  return resetToken
}

// Signs the admin out of every device on success.
export const resetPassword = (resetToken, newPassword, confirmPassword) =>
  apiRequest('/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  })

// Signed in. Other sessions stay valid (backend behaviour).
export const changePassword = (currentPassword, newPassword) =>
  apiRequest('/admin/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  })

/**
 * Mirrors the backend `passwordRequired` rule: 8–24 characters with at least one uppercase letter,
 * one number and one special character. Returns an error message, or null when valid.
 */
export const passwordProblem = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 24) return 'Password must be at most 24 characters'
  const missing = [
    [/[A-Z]/, 'an uppercase letter'],
    [/[0-9]/, 'a number'],
    [/[^A-Za-z0-9]/, 'a special character'],
  ]
    .filter(([pattern]) => !pattern.test(password))
    .map(([, label]) => label)
  return missing.length ? `Password must contain ${missing.join(', ')}` : null
}

export const PASSWORD_HINT = '8–24 characters, with an uppercase letter, a number and a special character.'
