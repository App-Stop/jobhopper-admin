import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Briefcase,
  Inbox,
  Banknote,
  AlertTriangle,
  Tag,
  SlidersHorizontal,
  LogOut,
  Bell,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'
import { adminLinkClick, adminPaths } from '../navigation'
import { apiCount } from '../api/client'
import { NOTIFICATIONS_CHANGED_EVENT } from '../utils/notifications'

// Number of failed broadcast notifications, for the sidebar badge. Errors leave the badge hidden.
const useFailedNotifications = () => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let live = true
    const load = () => apiCount('/admin/notifications', { status: 'failed' }).then((n) => live && setCount(n)).catch(() => {})
    const onChange = (event) => {
      if (typeof event.detail?.failed === 'number') setCount(event.detail.failed)
      else load()
    }
    load()
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange)
    return () => {
      live = false
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange)
    }
  }, [])
  return count
}

const NAV = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'verifications', label: 'Verification Queue', icon: ShieldCheck },
  { page: 'users', label: 'Users', icon: Users },
  { page: 'jobs', label: 'Jobs', icon: Briefcase },
  { page: 'openRequests', label: 'Open Requests', icon: Inbox },
  { page: 'payouts', label: 'Payouts', icon: Banknote },
  { page: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { page: 'supportTickets', label: 'Support Tickets', icon: Inbox },
  { page: 'userReports', label: 'User Reports', icon: ShieldCheck },
  { page: 'notifications', label: 'Notifications', icon: Bell },
  { page: 'categories', label: 'Categories', icon: Tag },
  { page: 'settings', label: 'Fees & Platform', icon: SlidersHorizontal },
]

const AdminLayout = ({ page, session, onLogout, children }) => {
  const failedNotifications = useFailedNotifications()
  const badges = { notifications: failedNotifications }
  return (
  <div className="admin-shell">
    <aside className="admin-sidebar">
      <a
        href={adminPaths.dashboard}
        className="admin-brand"
        onClick={adminLinkClick(adminPaths.dashboard)}
      >
        <img src={logo} alt="JobHopper" className="admin-logo admin-logo--sidebar" />
      </a>

      <nav className="admin-nav">
        {NAV.map(({ page: id, label, icon: Icon }) => (
          <a
            key={id}
            href={adminPaths[id]}
            className="admin-nav-link"
            aria-current={page === id ? 'page' : undefined}
            onClick={adminLinkClick(adminPaths[id])}
          >
            <Icon strokeWidth={1.5} />
            <span>{label}</span>
            {badges[id] > 0 && (
              <span className="admin-nav-badge" title={`${badges[id]} failed`} aria-label={`${badges[id]} failed`}>
                {badges[id] > 99 ? '99+' : badges[id]}
              </span>
            )}
          </a>
        ))}
      </nav>

      <div className="admin-account">
        <span className="admin-avatar" aria-hidden="true">
          {session?.name ? session.name[0] : 'A'}
        </span>
        <a
          href={adminPaths.account}
          className="admin-account-text no-underline"
          aria-current={page === 'account' ? 'page' : undefined}
          onClick={adminLinkClick(adminPaths.account)}
          title="Account settings"
        >
          <p className="admin-account-name">{session?.name || 'Administrator'}</p>
          <p className="admin-account-email">{session?.email || ''}</p>
        </a>
        <button
          type="button"
          className="admin-icon-btn"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut strokeWidth={1.5} />
        </button>
      </div>
    </aside>

    <main className="admin-main">{children}</main>
  </div>
  )
}

export default AdminLayout
