import { useState } from 'react'
import { Check, KeyRound } from 'lucide-react'
import { AdminHeader } from './AdminParts'
import { PASSWORD_HINT, changePassword, passwordProblem } from '../services/adminAuth'

const Account = ({ session }) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState(null) // { type: 'saved' | 'error', message }
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const problem =
      passwordProblem(newPassword) ||
      (newPassword !== confirmPassword && 'Passwords do not match') ||
      (newPassword === currentPassword && 'New password must be different from current password')
    if (problem) return setStatus({ type: 'error', message: problem })

    setSaving(true)
    setStatus(null)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus({ type: 'saved', message: 'Password changed' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not change the password' })
    } finally {
      setSaving(false)
    }
  }

  const field = (label, value, setValue, autoComplete) => (
    <label className="modal-field">
      <span className="modal-field-label">{label}</span>
      <input
        className="modal-field-input"
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setStatus(null)
        }}
      />
    </label>
  )

  return (
    <div className="admin-page">
      <AdminHeader title="Account" subtitle="Your admin profile and sign-in password." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">Profile</h2>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <div className="admin-info-box">
              <p className="admin-info-label">Name</p>
              <p className="font-semibold text-dark-900">{session?.name || '—'}</p>
            </div>
            <div className="admin-info-box">
              <p className="admin-info-label">Email</p>
              <p className="font-semibold text-dark-900">{session?.email || '—'}</p>
            </div>
            <p className="text-[12px] text-muted">Admin accounts are created on the server; name and email can&apos;t be edited here.</p>
          </div>
        </section>

        <form className="admin-card" onSubmit={submit}>
          <div className="admin-card-head justify-start">
            <span className="admin-settings-group-icon">
              <KeyRound strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="admin-card-title">Change password</h2>
              <p className="admin-card-hint">Your other signed-in devices stay signed in.</p>
            </div>
          </div>
          <div className="modal-fields p-5">
            {field('Current password', currentPassword, setCurrentPassword, 'current-password')}
            {field('New password', newPassword, setNewPassword, 'new-password')}
            {field('Confirm new password', confirmPassword, setConfirmPassword, 'new-password')}
            <p className="text-[12px] text-muted">{PASSWORD_HINT}</p>
            {status?.type === 'error' && <p className="modal-error" role="alert">{status.message}</p>}
            <div className="flex items-center justify-end gap-3">
              {status?.type === 'saved' && (
                <span className="admin-badge admin-badge--accent" role="status">
                  <Check strokeWidth={2.5} /> {status.message}
                </span>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Account
