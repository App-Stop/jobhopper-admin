import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImageOff, RefreshCw, Search, TrendingDown, TrendingUp, X } from 'lucide-react'
import { apiFileObjectUrl } from '../api/client'

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
// `renderFilter` turns a filter value into its button text (defaults to the value itself).
export const AdminToolbar = ({ query, onQuery, placeholder, filters, filter, onFilter, filterLabel, renderFilter = (f) => f }) => (
  <div className="admin-toolbar">
    <label className="admin-search">
      <Search strokeWidth={1.5} />
      <input
        type="search"
        maxLength={100}
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
    </label>
    {filters && (
      <div className="admin-filters" role="group" aria-label={filterLabel}>
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            className="admin-filter"
            onClick={() => onFilter(f)}
          >
            {renderFilter(f)}
          </button>
        ))}
      </div>
    )}
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

export const StatCard = ({ icon: Icon, label, value, change, note, highlight = false }) => {
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
      {note && <p className="admin-stat-label">{note}</p>}
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
  awaiting_dispatch: { label: 'Awaiting Dispatch', modifier: 'pending' },
  en_route: { label: 'En Route', modifier: 'pending' },
  arrived: { label: 'Arrived', modifier: 'pending' },
  started: { label: 'In Progress', modifier: 'pending' },
  completed: { label: 'Awaiting Confirmation', modifier: 'pending' },
  paid: { label: 'Paid', modifier: 'active' },
  reviewed: { label: 'Reviewed', modifier: 'active' },
  cancelled: { label: 'Cancelled', modifier: 'inactive' },
  disputed: { label: 'Disputed', modifier: 'suspended' },
  expired: { label: 'Expired', modifier: 'inactive' },
  declined: { label: 'Declined', modifier: 'inactive' },
  pending: { label: 'Pending', modifier: 'pending' },
  approved: { label: 'Approved', modifier: 'active' },
  rejected: { label: 'Rejected', modifier: 'suspended' },
  active: { label: 'Active', modifier: 'active' },
  inactive: { label: 'Inactive', modifier: 'inactive' },
  deactivated: { label: 'Deactivated', modifier: 'suspended' },
  suspended: { label: 'Suspended', modifier: 'suspended' },
  not_submitted: { label: 'Not Submitted', modifier: 'inactive' },
  under_review: { label: 'Under Review', modifier: 'pending' },
  awaiting_response: { label: 'Awaiting Response', modifier: 'pending' },
  resolved: { label: 'Resolved', modifier: 'active' },
}

// `overrides` replaces entries for one page, e.g. payout `completed` vs job `completed`.
export const StatusPill = ({ status, overrides }) => {
  const raw = String(status || '').trim()
  const key = raw.toLowerCase().replace(/[-\s]/g, '_')
  const conf = overrides?.[key] || STATUS_CONFIG[key] || {
    label: raw ? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown',
    modifier: 'inactive',
  }

  return (
    <span className={`admin-status admin-status--${conf.modifier}`} title={conf.label}>
      {conf.label}
    </span>
  )
}

const ACTION_KEYS = new Set(['action', 'actions'])

/**
 * Lists never scroll sideways: while laid out as a table, the wrapper checks whether the table
 * overflows it, and if so switches to the stacked (label/value) layout. It switches back once the
 * wrapper is wider than the table needed. Runs in layout effects, so the user never sees the overflow.
 */
const useStackedLayout = (rows, columnCount) => {
  const wrapRef = useRef(null)
  const neededWidth = useRef(0)
  const [stacked, setStacked] = useState(false)

  // New rows can change how wide the table needs to be, so measure it as a table again.
  useLayoutEffect(() => {
    neededWidth.current = 0
    setStacked(false)
  }, [rows, columnCount])

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const check = () => {
      const available = wrap.clientWidth
      if (stacked) {
        if (available >= neededWidth.current) setStacked(false)
        return
      }
      if (wrap.scrollWidth > available + 1) {
        neededWidth.current = wrap.scrollWidth + 24
        setStacked(true)
      }
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [stacked, rows, columnCount])

  return [wrapRef, stacked]
}

// `columns`: [{ key, label, render?, align? }] — `render` receives the row.
export const AdminTable = ({ title, action, columns, rows = [], empty = 'Nothing to show yet.', compact = false, onRowClick }) => {
  const [wrapRef, stacked] = useStackedLayout(rows, columns.length)
  const alignClass = (col) => (col.align === 'right' ? 'text-right' : 'text-left')

  return (
    <section className="admin-card">
      {(title || action) && (
        <div className="admin-card-head">
          {title && <h2 className="admin-card-title">{title}</h2>}
          {action}
        </div>
      )}
      <div className="admin-table-wrap" ref={wrapRef}>
        <table className={`admin-table ${compact ? 'admin-table--compact' : ''} ${stacked ? 'admin-table--stacked' : ''}`}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={alignClass(col)}>
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
                <tr key={row._id || row.id || idx} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={alignClass(col)}
                      data-label={col.label}
                      data-actions={ACTION_KEYS.has(col.key) || undefined}
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
}

export const NameCell = ({ name = 'User', sub, avatarChar }) => (
  <div className="admin-name-cell">
    <span className="admin-avatar admin-avatar--sm shrink-0" aria-hidden="true">
      {avatarChar || (name ? name[0] : 'U')}
    </span>
    <div className="min-w-0 max-w-[200px]">
      <p className="admin-cell-strong truncate" title={name}>{name}</p>
      {sub && <p className="admin-cell-sub truncate" title={sub}>{sub}</p>}
    </div>
  </div>
)

/**
 * Shows a backend file object. Public files have an http(s) `location`; private ones (ID documents
 * stored as `private://…`, dispute evidence with `url: /files/:id/content`) are fetched with the
 * admin token and shown from an object URL.
 */
export const FileImage = ({ file, alt, className = '' }) => {
  const publicUrl = /^https?:\/\//.test(file?.location || '') ? file.location : null
  const [src, setSrc] = useState(publicUrl)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (publicUrl || !file?._id) return
    let objectUrl = null
    let cancelled = false
    apiFileObjectUrl(file._id)
      .then((url) => {
        objectUrl = url
        if (cancelled) URL.revokeObjectURL(url)
        else setSrc(url)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file?._id, publicUrl])

  const box = `flex items-center justify-center overflow-hidden rounded-[10px] bg-fill ${className}`
  if (!file) {
    return (
      <div className={`${box} text-[12px] text-muted`}>
        <ImageOff className="size-4 mr-1.5" strokeWidth={1.5} /> Not provided
      </div>
    )
  }
  if (failed) return <div className={`${box} text-[12px] text-rose-600`}>Couldn&apos;t load image</div>
  if (!src) return <div className={`${box} text-[12px] text-muted`}>Loading…</div>
  return (
    <a href={src} target="_blank" rel="noreferrer" className={box}>
      <img src={src} alt={alt || file.filename || 'File'} className="size-full object-cover" />
    </a>
  )
}

// Previous / next controls for server-paginated lists.
export const Pager = ({ page, totalPages, onPage }) =>
  totalPages > 1 ? (
    <div className="flex items-center justify-end gap-3 text-[13px] text-muted">
      <button type="button" className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  ) : null

