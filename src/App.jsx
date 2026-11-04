import { useEffect, useState } from 'react'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import Verifications from './pages/Verifications'
import Users from './pages/Users'
import Jobs from './pages/Jobs'
import Disputes from './pages/Disputes'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import Payouts from './pages/Payouts'
import OpenRequests from './pages/OpenRequests'
import Account from './pages/Account'
import { adminLogout, fetchAdminProfile, getAdminSession } from './services/adminAuth'
import { currentAdminPage } from './navigation'
import { UNAUTHORIZED_EVENT } from './api/client'
import './pages/admin.css'

const App = () => {
  const [session, setSession] = useState(getAdminSession)
  const [page, setPage] = useState(currentAdminPage)

  useEffect(() => {
    const handleChange = () => {
      setPage(currentAdminPage())
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', handleChange)
    return () => window.removeEventListener('popstate', handleChange)
  }, [])

  // The API client clears the stored token on a 401; drop back to the login screen.
  useEffect(() => {
    const handleUnauthorized = () => setSession(null)
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  // Refresh the admin's name/email from GET /admin/me once signed in.
  const signedIn = !!session
  useEffect(() => {
    if (!signedIn) return
    fetchAdminProfile()
      .then((fresh) => fresh && setSession(fresh))
      .catch(() => {}) // a 401 is handled by the client; anything else keeps the stored session
  }, [signedIn])

  if (!session) return <AdminLogin onLogin={setSession} />

  const logout = () => {
    adminLogout()
    setSession(null)
  }

  return (
    <AdminLayout page={page} session={session} onLogout={logout}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'verifications' && <Verifications />}
      {page === 'users' && <Users />}
      {page === 'jobs' && <Jobs />}
      {page === 'openRequests' && <OpenRequests />}
      {page === 'payouts' && <Payouts />}
      {page === 'disputes' && <Disputes />}
      {page === 'categories' && <Categories />}
      {page === 'settings' && <Settings />}
      {page === 'account' && <Account session={session} />}
    </AdminLayout>
  )
}

export default App
