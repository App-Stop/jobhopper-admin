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
} from 'lucide-react'
import logo from '../assets/logo.png'
import { adminLinkClick, adminPaths } from '../navigation'

const NAV = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'verifications', label: 'Verification Queue', icon: ShieldCheck },
  { page: 'users', label: 'Users', icon: Users },
  { page: 'jobs', label: 'Jobs & Orders', icon: Briefcase },
  { page: 'openRequests', label: 'Open Requests', icon: Inbox },
  { page: 'payouts', label: 'Payouts', icon: Banknote },
  { page: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { page: 'categories', label: 'Categories', icon: Tag },
  { page: 'settings', label: 'Fees & Platform', icon: SlidersHorizontal },
]

const AdminLayout = ({ page, session, onLogout, children }) => (
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

export default AdminLayout
