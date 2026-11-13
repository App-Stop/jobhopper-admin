import { useEffect, useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, Pager, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import ListFilters from './ListFilters'
import { formatDate, formatDateTime, formatMoney } from '../constants'

// Backend WITHDRAWAL_STATUSES.
const PAYOUT_STATUS = {
  pending: { label: 'Pending', modifier: 'pending' },
  processing: { label: 'Processing', modifier: 'pending' },
  reversal_pending: { label: 'Reversal Pending', modifier: 'suspended' },
  completed: { label: 'Paid Out', modifier: 'active' },
  failed: { label: 'Failed', modifier: 'suspended' },
}
const FILTERS = ['All', ...Object.keys(PAYOUT_STATUS)]
const filterLabel = (f) => (f === 'All' ? 'All' : PAYOUT_STATUS[f].label)

const PAGE_SIZE = 25

const bankLabel = (b) =>
  b ? [b.accountHolderName, b.accountType, b.last4 && `···${b.last4}`].filter(Boolean).join(' · ') : '—'

/**
 * Read-only list of worker withdrawals. Search, status and date filters run on the server
 * (GET /admin/payouts); `counts` per status ignore the status filter, so every tab keeps its number.
 */
const Payouts = () => {
  const [payouts, setPayouts] = useState([])
  const [counts, setCounts] = useState({})
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('') // debounced `query`
  const [filter, setFilter] = useState('All')
  const [statuses, setStatuses] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState(null)
  const requestId = useRef(0)
  const detailRequest = useRef(0)
  const [loading, setLoading] = useState(false)
  useEffect(() => () => { requestId.current++; detailRequest.current++ }, [])
  const closeDetail = () => { detailRequest.current++; setSelected(null) }

  // Any filter change goes back to page 1.
  const withPageReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

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
    if (from && to && from > to) {
      setError('The end date must be on or after the start date.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page, limit: PAGE_SIZE })
    if (search) params.set('search', search)
    if (statuses.length) params.set('status', statuses.join(','))
    else if (filter !== 'All') params.set('status', filter)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    try {
      const res = await apiRequest(`/admin/payouts?${params}`)
      if (id !== requestId.current) return // a newer request is in flight
      if (!Array.isArray(res?.data?.payouts)) throw new Error('Unexpected list response from the server.')
      setPayouts(res.data.payouts)
      setCounts(res?.data?.counts || {})
      setPagination(res?.data?.pagination || null)
      setError(null)
    } catch (err) {
      if (id === requestId.current) setError(err.message)
    } finally { if (id === requestId.current) setLoading(false) }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filter, from, to, statuses])

  const openDetail = async (p) => {
    const id = ++detailRequest.current
    setSelected(p)
    setDetail(null)
    setDetailError(null)
    try {
      const res = await apiRequest(`/admin/payouts/${p._id}`)
      if (id !== detailRequest.current) return
      if (!res?.data?._id) throw new Error('Unexpected detail response from the server.')
      setDetail(res.data)
    } catch (err) {
      if (id === detailRequest.current) setDetailError(err.message)
    }
  }

  const columns = [
    {
      key: 'worker',
      label: 'Worker',
      render: (p) => (
        <NameCell
          name={p.worker?.fullName || 'Worker'}
          sub={p.worker?.email || p.worker?.phone}
          avatarChar={p.worker?.fullName?.[0] || 'W'}
        />
      ),
    },
    {
      key: 'bank',
      label: 'Bank account',
      render: (p) => <span className="text-[13px]">{bankLabel(p.bankAccount)}</span>,
    },
    {
      key: 'amount',
      label: 'Requested',
      align: 'right',
      render: (p) => <span className="tabular-nums">{formatMoney(p.amount)}</span>,
    },
    {
      key: 'fee',
      label: 'Fee',
      align: 'right',
      render: (p) => <span className="tabular-nums text-muted">{formatMoney(p.fee)}</span>,
    },
    {
      key: 'payout',
      label: 'Sent to bank',
      align: 'right',
      render: (p) => <span className="font-semibold tabular-nums text-primary">{formatMoney(p.payoutAmount)}</span>,
    },
    {
      key: 'date',
      label: 'Requested on',
      render: (p) => <span>{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <StatusPill status={p.status} overrides={PAYOUT_STATUS} />,
    },
    {
      key: 'action',
      label: 'Details',
      align: 'right',
      render: (p) => (
        <div className="admin-row-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => openDetail(p)}>
            <Eye strokeWidth={2} /> View
          </button>
        </div>
      ),
    },
  ]

  const totalPages = pagination?.totalPages ?? 1
  const allCount = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0)

  return (
    <div className="admin-page">
      <AdminHeader
        title="Payouts"
        count={pagination?.total ?? payouts.length}
        subtitle={`Worker withdrawals to their bank accounts, newest first. ${counts.failed ? `${counts.failed} failed and ` : ''}${(counts.pending || 0) + (counts.processing || 0)} still in progress.`}
        actions={<RefreshButton onRefresh={load} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search worker, email, phone or Stripe ID"
        filters={FILTERS}
        filter={filter}
        onFilter={(value) => { setStatuses([]); withPageReset(setFilter)(value) }}
        filterLabel="Filter by payout status"
        renderFilter={(f) => `${filterLabel(f)} (${f === 'All' ? allCount : counts[f] ?? 0})`}
      />

      <ListFilters fields={[{ key: 'status', label: 'Exact statuses (multiple)', multiple: true, options: Object.entries(PAYOUT_STATUS).map(([value, config]) => ({ value, label: config.label })) }]} onApply={(values) => { setStatuses(values.status || []); setFilter('All'); setPage(1) }} />
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted">
        <label className="flex items-center gap-2">
          From
          <input type="date" className="admin-date-input" value={from} max={to || undefined} onChange={(e) => withPageReset(setFrom)(e.target.value)} />
        </label>
        <label className="flex items-center gap-2">
          To
          <input type="date" className="admin-date-input" value={to} min={from || undefined} onChange={(e) => withPageReset(setTo)(e.target.value)} />
        </label>
        {(from || to) && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setFrom(''); setTo(''); setPage(1) }}>
            Clear dates
          </button>
        )}
        <span>Dates are in UTC.</span>
      </div>

      {loading && <p role="status">Loading payouts…</p>}
      {error && <p role="alert" className="text-rose-600">Couldn’t load payouts: {error}</p>}
      <AdminTable
        columns={columns}
        rows={payouts}
        empty={error ? `Couldn't load payouts: ${error}` : 'No payouts match your filters.'}
      />

      <Pager page={page} totalPages={totalPages} onPage={setPage} />

      {selected && (
        <AdminModal
          title={`Payout · ${selected.worker?.fullName || 'Worker'}`}
          subtitle={`Requested ${formatDateTime(selected.createdAt)}`}
          onClose={closeDetail}
          footer={
            <button type="button" className="btn btn-primary" onClick={closeDetail}>
              Close
            </button>
          }
        >
          {detailError && <p className="text-[13px] text-rose-600">Couldn&apos;t load this payout: {detailError} <button className="btn btn-sm btn-outline" onClick={() => openDetail(selected)}>Retry</button></p>}
          {!detail && !detailError && <p className="text-[13px] text-muted">Loading…</p>}
          {detail && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={detail.status} overrides={PAYOUT_STATUS} />
                {detail.stripePayoutStatus && (
                  <span className="text-[13px] text-muted">Stripe payout: {detail.stripePayoutStatus}</span>
                )}
              </div>

              {(detail.failureCode || detail.failureMessage) && (
                <div className="admin-info-box border-rose-200 bg-rose-50/50">
                  <p className="admin-info-label">Failure{detail.failureCode ? ` (${detail.failureCode})` : ''}</p>
                  <p className="text-dark-900">{detail.failureMessage || '—'}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Requested', detail.amount],
                  ['Withdrawal fee', detail.fee],
                  ['Sent to bank', detail.payoutAmount],
                ].map(([label, value]) => (
                  <div key={label} className="admin-info-box">
                    <p className="admin-info-label">{label}</p>
                    <p className="font-semibold text-dark-900 tabular-nums">{formatMoney(value)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="admin-info-box">
                  <p className="admin-info-label">Worker</p>
                  <p className="font-semibold text-dark-900">{detail.worker?.fullName || '—'}</p>
                  <p className="text-[12px] text-muted">
                    {[detail.worker?.email, detail.worker?.phone].filter(Boolean).join(' · ')}
                    {detail.worker?.isDeactivated && ' · Deactivated'}

                  </p>
                </div>
                <div className="admin-info-box">
                  <p className="admin-info-label">Bank account</p>
                  <p className="text-dark-900">{bankLabel(detail.bankAccount)}</p>
                </div>
                <div className="admin-info-box">
                  <p className="admin-info-label">Worker wallet now</p>
                  <p className="text-dark-900">
                    {formatMoney(detail.workerWallet?.available)} available · {formatMoney(detail.workerWallet?.pending)} pending
                  </p>
                </div>
                <div className="admin-info-box">
                  <p className="admin-info-label">Stripe references</p>
                  <p className="break-all font-mono text-[12px] text-dark-900">
                    Transfer: {detail.stripeTransferId || '—'}
                    <br />
                    Payout: {detail.stripePayoutId || '—'}
                  </p>
                </div>
              </div>

              <p className="text-[12px] text-muted">Last updated {formatDateTime(detail.updatedAt)}</p>
            </>
          )}
        </AdminModal>
      )}
    </div>
  )
}

export default Payouts
