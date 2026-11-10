import { useState } from 'react'
import logo from '../assets/logo.png'
import {
  PASSWORD_HINT,
  adminLogin,
  passwordProblem,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
} from '../services/adminAuth'

// Steps: 'login' → (forgot) 'email' → 'code' → 'reset' → back to 'login'.
const HEADINGS = {
  login: ['Sign in to the JobHopper admin console', ''],
  email: ['Reset your password', "Enter your admin email and we'll send you a 5-digit code."],
  code: ['Check your email', 'Enter the 5-digit code we sent. It expires after 10 minutes.'],
  reset: ['Choose a new password', 'You’ll be signed out of every device and can sign in with the new password.'],
}

// Flat style: the placeholder is the visible label; the real label stays for screen readers.
const Field = ({ label, ...input }) => (
  <label className="block">
    <span className="sr-only">{label}</span>
    <input className="admin-login-input" placeholder={label} required {...input} />
  </label>
)

const AdminLogin = ({ onLogin }) => {
  const [step, setStep] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const goTo = (next) => {
    setStep(next)
    setError('')
  }

  const run = async (fn) => {
    setError('')
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    if (step === 'login') {
      return run(async () => {
        onLogin(await adminLogin(email.trim(), password))
      })
    }
    if (step === 'email') {
      return run(async () => {
        await requestPasswordReset(email)
        setNotice('')
        setCode('')
        goTo('code')
      })
    }
    if (step === 'code') {
      return run(async () => {
        setResetToken(await verifyResetCode(email, code))
        setNewPassword('')
        setConfirmPassword('')
        goTo('reset')
      })
    }
    // reset
    const problem = passwordProblem(newPassword)
    if (problem) return setError(problem)
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    return run(async () => {
      await resetPassword(resetToken, newPassword, confirmPassword)
      setPassword('')
      setResetToken('')
      setNotice('Password updated. Sign in with your new password.')
      goTo('login')
    })
  }

  const [title, hint] = HEADINGS[step]
  const submitLabel = {
    login: loading ? 'Signing in…' : 'Sign in',
    email: loading ? 'Sending…' : 'Send reset code',
    code: loading ? 'Checking…' : 'Verify code',
    reset: loading ? 'Saving…' : 'Set new password',
  }[step]

  return (
    <main className="admin-login">
      <header className="admin-login-top">
        <img src={logo} alt="JobHopper" className="admin-logo" />
      </header>

      <div className="admin-login-body">
        <form className="admin-login-form" onSubmit={submit}>
          <h1 className="admin-login-title">{title}</h1>
          {hint && <p className="admin-login-hint">{hint}</p>}

          <div className="admin-login-fields">
            {(step === 'login' || step === 'email') && (
              <Field
                label="Email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            {step === 'login' && (
              <Field
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {step === 'code' && (
              <Field
                label={`5-digit code sent to ${email}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{5}"
                maxLength={5}
                title="The 5-digit code from the email"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            )}

            {step === 'reset' && (
              <>
                <Field
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <p className="px-1 text-[13px] leading-normal text-muted">{PASSWORD_HINT}</p>
              </>
            )}

            {notice && !error && (
              <p className="admin-login-note bg-accent-light text-emerald-700" role="status">{notice}</p>
            )}
            {error && <p className="admin-login-note bg-rose-50 text-rose-600" role="alert">{error}</p>}
          </div>

          <button type="submit" className="admin-login-submit" disabled={loading}>
            {submitLabel}
          </button>

          <div className="admin-login-links">
            {step === 'login' ? (
              <button type="button" className="admin-login-link" onClick={() => { setNotice(''); goTo('email') }}>
                Forgot password?
              </button>
            ) : (
              <>
                {step === 'code' && (
                  <button
                    type="button"
                    className="admin-login-link"
                    disabled={loading}
                    onClick={() =>
                      run(async () => {
                        await requestPasswordReset(email)
                        setNotice('A new code has been sent.')
                      })
                    }
                  >
                    Didn’t get it? Resend code
                  </button>
                )}
                <button type="button" className="admin-login-link" onClick={() => { setNotice(''); goTo('login') }}>
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <footer className="admin-login-foot">
        <span>© {new Date().getFullYear()} JobHopper</span>
        <span>Authorized administrators only</span>
      </footer>
    </main>
  )
}

export default AdminLogin
