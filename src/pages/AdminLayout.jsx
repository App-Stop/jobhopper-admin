import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Briefcase,
  AlertTriangle,
  Tag,
  SlidersHorizontal,
  LogOut,
  ExternalLink,
} from 'lucide-react'
import logo from '../assets/logo.png'
import { adminLinkClick, adminPaths } from '../navigation'
import { MARKETPLACE_URL } from '../config'

const NAV = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'verifications', label: 'Verification Queue', icon: ShieldCheck },
  { page: 'users', label: 'Users', icon: Users },
  { page: 'jobs', label: 'Jobs & Orders', icon: Briefcase },
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

      <a
        href={MARKETPLACE_URL}
        target="_blank"
        rel="noreferrer"
        className="admin-nav-link hidden lg:flex"
      >
        <ExternalLink strokeWidth={1.5} />
        <span>View marketplace</span>
      </a>

      <div className="admin-account">
        <span className="admin-avatar" aria-hidden="true">
          {session?.name ? session.name[0] : 'A'}
        </span>
        <div className="admin-account-text">
          <p className="admin-account-name">{session?.name || 'Administrator'}</p>
          <p className="admin-account-email">{session?.email || 'admin@jobhopper.com'}</p>
        </div>
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
