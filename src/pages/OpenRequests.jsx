import { useEffect, useRef, useState } from 'react'
import { Eye, MapPin, Zap } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, FileImage, NameCell, Pager, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import { categoryNames, formatDateTime, formatMoney } from '../constants'

const POST_TYPES = { All: null, 'Open posts': 'open', 'Direct hire': 'direct_hire' }
const FILTERS = Object.keys(POST_TYPES)

const URGENCY_LABELS = { standard: 'Standard', within_24h: 'Within 24h', asap: 'ASAP' }
const EXPIRY_LABELS = { request_timeout: 'No worker accepted in time', payment_timeout: 'Client didn’t pay in time' }
const APPLICANT_TYPE_LABELS = { apply: 'Accepted the listed price', counter_offer: 'Counter-offer' }

const PAGE_SIZE = 25

const formatAddress = (a) =>
  a ? [a.street, a.apartment, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(', ') || '—' : '—'

const Urgency = ({ value }) =>
  value === 'asap' ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase text-amber-700">
      <Zap className="size-3.5" strokeWidth={2} /> ASAP
    </span>
  ) : (
    <span className="text-[12px] font-semibold uppercase text-muted">{URGENCY_LABELS[value] || value || '—'}</span>
  )

const PersonLine = ({ person }) =>
  person ? (
    <p className="text-[12px] text-muted">
      {[person.email, person.phone].filter(Boolean).join(' · ')}
      {person.isDeactivated && ' · Deactivated'}
      {person.isDeleted && ' · Deleted account'}
    </p>
  ) : null

/**
 * Read-only view of jobs that are still `open`: posts for all workers and direct-hire requests
 * sent to one worker. Filters and search run on the server (GET /admin/open-requests).
 */
const OpenRequests = () => {
  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({})
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [urgency, setUrgency] = useState('')
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState(null)
  const requestId = useRef(0)

  useEffect(() => {
    const next = query.trim()
    if (next === search) return
    const t = setTimeout(() => {
      setSearch(next)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query, search])

  const load = async () => {
    const id = ++requestId.current
    const params = new URLSearchParams({ page, limit: PAGE_SIZE })
    if (search) params.set('search', search)
    if (POST_TYPES[filter]) params.set('postType', POST_TYPES[filter])
    if (urgency) params.set('urgency', urgency)
    try {
      const res = await apiRequest(`/admin/open-requests?${params}`)
      if (id !== requestId.current) return
      setRequests(res?.data?.requests || [])
      setCounts(res?.data?.counts || {})
      setPagination(res?.data?.pagination || null)
      setError(null)
    } catch (err) {
      if (id === requestId.current) setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filter, urgency])

  const openDetail = async (r) => {
    setSelected(r)
    setDetail(null)
    setDetailError(null)
    try {
      const res = await apiRequest(`/admin/open-requests/${r._id}`)
      setDetail(res?.data || null)
    } catch (err) {
      setDetailError(err.message)
    }
  }

  const countFor = (f) =>
    f === 'All' ? (counts.open || 0) + (counts.direct_hire || 0) : counts[POST_TYPES[f]] ?? 0

  const columns = [
    {
      key: 'job',
      label: 'Request',
      render: (r) => (
        <NameCell
          name={r.jobCode || 'Request'}
          sub={categoryNames(r).join(', ') || r.description}
          avatarChar={categoryNames(r)[0]?.[0] || 'R'}
        />
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => (
        <span className="admin-badge">{r.postType === 'direct_hire' ? 'Direct hire' : 'Open post'}</span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (r) => (
        <div>
          <p className="admin-cell-strong">{r.client?.fullName || '—'}</p>
          {r.city && <p className="admin-cell-sub">{r.city}</p>}
        </div>
      ),
    },
    {
      key: 'urgency',
      label: 'Urgency',
      render: (r) => <Urgency value={r.urgency} />,
    },
    {
      key: 'budget',
      label: 'Budget',
      align: 'right',
      render: (r) => <span className="font-semibold tabular-nums text-primary">{formatMoney(r.budget)}</span>,
    },
    {
      key: 'applicants',
      label: 'Applicants',
      align: 'right',
      render: (r) => (
        <span className="tabular-nums">
          {r.applicants?.total ?? 0}
          {r.applicants?.pending > 0 && <span className="text-muted"> ({r.applicants.pending} new)</span>}
        </span>
      ),
    },
    {
      key: 'expires',
      label: 'Expires',
      render: (r) => <span className="text-[13px]">{formatDateTime(r.requestExpiresAt)}</span>,
    },
    {
      key: 'action',
      label: 'Details',
      align: 'right',
      render: (r) => (
        <div className="admin-row-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => openDetail(r)}>
            <Eye strokeWidth={2} /> View
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminHeader
        title="Open Requests"
        count={pagination?.total ?? requests.length}
        subtitle="Jobs still waiting for a worker: open posts for every worker, and direct-hire requests sent to one worker. Read-only."
        actions={<RefreshButton onRefresh={load} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search job code, description, client or applicant"
        filters={FILTERS}
        filter={filter}
        onFilter={(f) => {
          setFilter(f)
          setPage(1)
        }}
        filterLabel="Filter by request type"
        renderFilter={(f) => `${f} (${countFor(f)})`}
      />

      <label className="flex items-center gap-2 text-[13px] text-muted">
        Urgency
        <select
          className="admin-date-input"
          value={urgency}
          onChange={(e) => {
            setUrgency(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Any</option>
          {Object.entries(URGENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <AdminTable
        columns={columns}
        rows={requests}
        empty={error ? `Couldn't load open requests: ${error}` : 'No open requests match your filters.'}
      />

      <Pager page={page} totalPages={pagination?.totalPages ?? 1} onPage={setPage} />

      {selected && (
        <AdminModal
          size="max-w-2xl"
          title={selected.jobCode || 'Request'}
          subtitle={[selected.postType === 'direct_hire' ? 'Direct hire' : 'Open post', categoryNames(selected).join(', ')]
            .filter(Boolean)
            .join(' · ')}
          onClose={() => setSelected(null)}
          footer={
            <>
              <p className="mr-auto text-[13px] text-muted">
                Budget
                <span className="ml-2 text-[17px] font-bold tabular-nums text-primary">{formatMoney(selected.budget)}</span>
                {detail?.priorityFee > 0 && <span className="ml-1.5">+ {formatMoney(detail.priorityFee)} priority</span>}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setSelected(null)}>
                Close
              </button>
            </>
          }
        >
          {detailError && <p className="text-[13px] text-rose-600">Couldn&apos;t load this request: {detailError}</p>}
          {!detail && !detailError && <p className="text-[13px] text-muted">Loading…</p>}
          {detail && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={detail.status} />
                <Urgency value={detail.urgency} />
                {detail.expiryReason && (
                  <span className="text-[13px] text-muted">{EXPIRY_LABELS[detail.expiryReason] || detail.expiryReason}</span>
                )}
              </div>
              {detail.status !== 'open' && (
                <p className="text-[12px] text-muted">This request is no longer open; it shows what became of it.</p>
              )}

              {detail.description && (
                <div className="admin-info-box bg-surface leading-relaxed text-dark-900">
                  <p className="admin-info-label">Description</p>
                  {detail.description}
                </div>
              )}

              {detail.photos?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {detail.photos.map((p) => (
                    <FileImage key={p._id} file={p} className="aspect-square" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="admin-info-box">
                  <p className="admin-info-label">Client</p>
                  <p className="font-semibold text-dark-900">{detail.client?.fullName || '—'}</p>
                  <PersonLine person={detail.client} />
                </div>
                <div className="admin-info-box">
                  <p className="admin-info-label">Timing</p>
                  <p className="text-[13px] text-dark-900">Posted {formatDateTime(detail.createdAt)}</p>
                  <p className="text-[13px] text-dark-900">
                    Scheduled {detail.scheduledAt ? formatDateTime(detail.scheduledAt) : 'ASAP'}
                  </p>
                  <p className="text-[13px] text-dark-900">Expires {formatDateTime(detail.requestExpiresAt)}</p>
                </div>
              </div>

              <div className="admin-info-box flex items-start gap-2.5">
                <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="admin-info-label">Service location{detail.address?.label ? ` · ${detail.address.label}` : ''}</p>
                  <p className="text-dark-900">{formatAddress(detail.address)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="admin-field-label">
                  Applicants ({detail.applicants?.total ?? 0}
                  {detail.applicants?.pending ? `, ${detail.applicants.pending} pending` : ''})
                </span>
                {detail.applicants?.items?.length ? (
                  detail.applicants.items.map((a) => (
                    <div key={a._id} className="admin-info-box">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-dark-900">{a.worker?.fullName || 'Worker'}</p>
                        <StatusPill status={a.status} />
                      </div>
                      <PersonLine person={a.worker} />
                      <p className="mt-1 text-[13px] text-dark-900">
                        {a.type ? APPLICANT_TYPE_LABELS[a.type] || a.type : 'Direct-hire offer, not answered yet'}
                        {a.type === 'counter_offer' && a.proposedAmount !== null && ` · ${formatMoney(a.proposedAmount)}`}
                        {a.type === 'apply' && ` · ${formatMoney(detail.budget)}`}
                      </p>
                      {a.note && <p className="mt-1 text-[13px] text-muted">“{a.note}”</p>}
                      <p className="mt-1 text-[12px] text-muted">{formatDateTime(a.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-muted">No applicants yet.</p>
                )}
              </div>
            </>
          )}
        </AdminModal>
      )}
    </div>
  )
}

export default OpenRequests
