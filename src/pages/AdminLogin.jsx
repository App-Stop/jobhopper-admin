import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import logo from '../assets/logo.png'
import { adminLogin } from '../services/adminAuth'

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await adminLogin(email.trim(), password)
      onLogin(session)
    } catch (err) {
      setError(err.message || 'Incorrect email or password')
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('admin@jobhopper.com')
    setPassword('AdminPassword123!')
    setError('')
  }

  return (
    <main className="admin-login">
      <span className="admin-login-glow" aria-hidden="true" />

      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-head">
          <img src={logo} alt="JobHopper" className="admin-logo" />
          <span className="admin-badge">
            <Lock strokeWidth={2} />
            Admin Portal
          </span>
        </div>

        <div className="modal-heading">
          <h1 className="modal-title">Welcome back</h1>
          <p className="modal-hint">Sign in to manage JobHopper operations.</p>
        </div>

        <div className="modal-fields">
          <label className="modal-field">
            <span className="modal-field-label">Admin Email</span>
            <input
              className="modal-field-input"
              type="email"
              autoComplete="username"
              placeholder="admin@jobhopper.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="modal-field">
            <span className="modal-field-label">Password</span>
            <input
              className="modal-field-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="modal-error" role="alert">{error}</p>}
        </div>

        <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in to Console'}
        </button>

        <button
          type="button"
          onClick={fillDemo}
          className="modal-btn modal-btn-outline gap-2 text-[14px]"
        >
          <Sparkles className="size-4 text-accent" />
          Use Demo Credentials
        </button>
      </form>
    </main>
  )
}

export default AdminLogin
