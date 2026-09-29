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
import { adminLogout, getAdminSession } from './services/adminAuth'
import { currentAdminPage } from './navigation'
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
      {page === 'disputes' && <Disputes />}
      {page === 'categories' && <Categories />}
      {page === 'settings' && <Settings />}
    </AdminLayout>
  )
}

export default App
