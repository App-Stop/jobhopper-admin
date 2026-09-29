import { useEffect, useState } from 'react'
import { RefreshCw, Search, TrendingDown, TrendingUp, X } from 'lucide-react'

// `count` renders as a pill next to the title; `actions` is the right-hand button group.
export const AdminHeader = ({ title, subtitle, count, actions }) => (
  <header className="admin-header">
    <div className="admin-header-text">
      <h1 className="admin-title">
        {title}
        {count !== undefined && <span className="admin-title-count">{count}</span>}
      </h1>
      {subtitle && <p className="admin-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="admin-header-actions">{actions}</div>}
  </header>
)

// Outline button that spins its icon while the async `onRefresh` is running.
export const RefreshButton = ({ onRefresh }) => {
  const [busy, setBusy] = useState(false)

  const click = async () => {
    setBusy(true)
    try {
      await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn btn-outline" onClick={click} disabled={busy}>
      <RefreshCw strokeWidth={2} className={busy ? 'animate-spin' : ''} />
      Refresh
    </button>
  )
}

// Search box + segmented status filter shown above list tables.
export const AdminToolbar = ({ query, onQuery, placeholder, filters, filter, onFilter, filterLabel }) => (
  <div className="admin-toolbar">
    <label className="admin-search">
      <Search strokeWidth={1.5} />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
    </label>
    <div className="admin-filters" role="group" aria-label={filterLabel}>
      {filters.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={filter === f}
          className="admin-filter"
          onClick={() => onFilter(f)}
        >
          {f}
        </button>
      ))}
    </div>
  </div>
)

// Dialog shell. Pass `as="form"` + `onSubmit` for form dialogs; `footer` holds the action buttons.
export const AdminModal = ({ title, subtitle, onClose, footer, children, size = 'max-w-lg', as: Tag = 'div', ...rest }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Tag className={`admin-modal ${size}`} role="dialog" aria-modal="true" aria-label={title} {...rest}>
        <div className="admin-modal-head">
          <div className="min-w-0">
            <h3 className="admin-modal-title">{title}</h3>
            {subtitle && <p className="admin-modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close">
            <X strokeWidth={2} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-foot">{footer}</div>}
      </Tag>
    </div>
  )
}

export const StatCard = ({ icon: Icon, label, value, change, highlight = false }) => {
  const hasChange = change !== undefined && change !== null
  const up = change >= 0
  const Trend = up ? TrendingUp : TrendingDown

  return (
    <article className={`admin-stat ${highlight ? 'admin-stat--primary' : ''}`}>
      <div className="admin-stat-top">
        <p className="admin-stat-label">{label}</p>
        <span className="admin-stat-icon">
          <Icon strokeWidth={1.5} />
        </span>
      </div>
      <p className="admin-stat-value">{value}</p>
      {hasChange && (
        <p className={`admin-trend ${up ? 'admin-trend--up' : 'admin-trend--down'}`}>
          <Trend strokeWidth={2} />
          {up ? '+' : ''}{change}% <span>vs last month</span>
        </p>
      )}
    </article>
  )
}

const STATUS_CONFIG = {
  open: { label: 'Open', modifier: 'pending' },
  accepted: { label: 'Accepted', modifier: 'pending' },
  awaiting_payment: { label: 'Awaiting Pay', modifier: 'pending' },
  en_route: { label: 'En Route', modifier: 'pending' },
  arrived: { label: 'Arrived', modifier: 'pending' },
  started: { label: 'In Progress', modifier: 'pending' },
  in_progress: { label: 'In Progress', modifier: 'pending' },
  completed: { label: 'Completed', modifier: 'active' },
  paid: { label: 'Paid', modifier: 'active' },
  reviewed: { label: 'Reviewed', modifier: 'active' },
  cancelled: { label: 'Cancelled', modifier: 'inactive' },
  disputed: { label: 'Disputed', modifier: 'suspended' },
  expired: { label: 'Expired', modifier: 'inactive' },
  pending: { label: 'Pending', modifier: 'pending' },
  approved: { label: 'Approved', modifier: 'active' },
  rejected: { label: 'Rejected', modifier: 'suspended' },
  active: { label: 'Active', modifier: 'active' },
  inactive: { label: 'Inactive', modifier: 'inactive' },
  deactivated: { label: 'Deactivated', modifier: 'suspended' },
  suspended: { label: 'Suspended', modifier: 'suspended' },
  resolved: { label: 'Resolved', modifier: 'active' },
  dismissed: { label: 'Dismissed', modifier: 'inactive' },
}

export const StatusPill = ({ status }) => {
  const raw = String(status || '').trim()
  const key = raw.toLowerCase().replace(/[-\s]/g, '_')
  const conf = STATUS_CONFIG[key] || {
    label: raw ? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown',
    modifier: 'inactive',
  }

  return (
    <span className={`admin-status admin-status--${conf.modifier}`}>
      {conf.label}
    </span>
  )
}

// `columns`: [{ key, label, render?, align? }] — `render` receives the row.
export const AdminTable = ({ title, action, columns, rows = [], empty = 'Nothing to show yet.' }) => (
  <section className="admin-card">
    {(title || action) && (
      <div className="admin-card-head">
        {title && <h2 className="admin-card-title">{title}</h2>}
        {action}
      </div>
    )}
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ textAlign: col.align === 'right' ? 'right' : 'left' }}
                className={col.align === 'right' ? 'text-right' : 'text-left'}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="admin-table-empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row._id || row.id || idx}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align === 'right' ? 'right' : 'left' }}
                    className={col.align === 'right' ? 'text-right' : 'text-left'}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
)

export const NameCell = ({ name = 'User', sub, avatarChar }) => (
  <div className="admin-name-cell">
    <span className="admin-avatar admin-avatar--sm shrink-0" aria-hidden="true">
      {avatarChar || (name ? name[0] : 'U')}
    </span>
    <div className="min-w-0 max-w-[200px]">
      <p className="admin-cell-strong truncate">{name}</p>
      {sub && <p className="admin-cell-sub truncate">{sub}</p>}
    </div>
  </div>
)
