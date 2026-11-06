import { useState, useEffect, useRef } from 'react'
import { Eye, Gavel, MessageSquarePlus, Search as SearchIcon } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, FileImage, NameCell, Pager, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import useAdminList from '../hooks/useAdminList'
import { formatDate, formatDateTime, formatMoney } from '../constants'

// Backend dispute statuses: open → under_review ⇄ awaiting_response → resolved.
// `awaiting_response` means an evidence request is still open; once it's answered or expires the
// backend reports the dispute as `under_review` again.
const FILTER_STATUSES = {
  Open: 'open',
  'Under Review': 'under_review',
  'Awaiting Response': 'awaiting_response',
  Resolved: 'resolved',
}
const FILTERS = ['All', ...Object.keys(FILTER_STATUSES)]

const REQUEST_STATE_LABELS = { open: 'Waiting for answer', answered: 'Answered', expired: 'Expired' }

const Photos = ({ photos }) =>
  photos?.length ? (
    <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
      {photos.map((p) => (
        <FileImage key={p._id} file={p} className="aspect-square" />
      ))}
    </div>
  ) : null

const Submission = ({ title, submission }) => (
  <div className="admin-info-box bg-surface">
    <p className="admin-info-label">{title}</p>
    <p className="font-semibold text-dark-900">{submission.reason || '—'}</p>
    {submission.description && <p className="mt-1 leading-relaxed text-muted">“{submission.description}”</p>}
    <Photos photos={submission.evidencePhotos} />
    {submission.submittedAt && (
      <p className="mt-1.5 text-[12px] text-muted">Submitted {formatDateTime(submission.submittedAt)}</p>
    )}
  </div>
)

const Party = ({ label, person }) => (
  <div className="admin-info-box">
    <p className="admin-info-label">{label}</p>
    <p className="font-semibold text-dark-900">{person?.fullName || '—'}</p>
    {person && (
      <p className="text-[12px] text-muted">
        {[person.email, person.phone].filter(Boolean).join(' · ')}
        {person.isDeactivated && ' · Deactivated'}
        {person.isDeleted && ' · Deleted account'}
      </p>
    )}
  </div>
)

const Disputes = () => {
  const [filter, setFilter] = useState('All')
  const { rows: reports, pagination, query, setQuery, page, setPage, error, loading, refresh: loadReports } = useAdminList('/admin/disputes', 'reports', { status: FILTER_STATUSES[filter] || '' })
  const [actionError, setActionError] = useState('')
  const detailRequest = useRef(0)
  const actionBusy = useRef(false)
  useEffect(() => () => { detailRequest.current++ }, [])

  // Detail modal
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [evidenceParty, setEvidenceParty] = useState('worker')
  const [evidenceMessage, setEvidenceMessage] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')

  const loadDetail = async (id) => {
    const request = ++detailRequest.current
    try {
      const res = await apiRequest(`/admin/disputes/${id}`)
      if (request !== detailRequest.current) return
      if (!res?.data?.filing) throw new Error('Unexpected dispute response from the server.')
      setDetail(res.data)
      setDetailError(null)
    } catch (err) {
      if (request === detailRequest.current) setDetailError(err.message)
    }
  }

  const openDetail = (r) => {
    setActionError('')
    setSelectedId(r._id)
    setDetail(null)
    setDetailError(null)
    setEvidenceParty('worker')
    setEvidenceMessage('')
    setRefundAmount('')
    setResolutionNote('')
    loadDetail(r._id)
  }

  const closeDetail = () => {
    if (actionBusy.current) return
    detailRequest.current++
    setSelectedId(null)
    setDetail(null)
  }

  // Runs an action, then refreshes both the detail and the list.
  const act = async (fn) => {
    if (actionBusy.current) return false
    actionBusy.current = true
    setActionError('')
    setBusy(true)
    try {
      const res = await fn()
      if (res?.data?.filing) setDetail(res.data)
      else await loadDetail(selectedId)
      loadReports()
      return true
    } catch (err) {
      setActionError(err.message || 'Action failed')
      return false
    } finally {
      actionBusy.current = false
      setBusy(false)
    }
  }

  const markUnderReview = () =>
    act(() =>
      apiRequest(`/admin/disputes/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'under_review' }),
      }),
    )

  const requestEvidence = async (e) => {
    e.preventDefault()
    const ok = await act(() =>
      apiRequest(`/admin/disputes/${selectedId}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          party: evidenceParty,
          ...(evidenceMessage.trim() ? { message: evidenceMessage.trim() } : {}),
        }),
      }),
    )
    if (ok) setEvidenceMessage('')
  }

  const serviceFee = detail?.payment?.serviceFee ?? null
  const refund = Number(refundAmount)
  const refundValid =
    refundAmount !== '' && Number.isFinite(refund) && refund >= 0 && serviceFee !== null && refund <= serviceFee

  const resolve = async (e) => {
    e.preventDefault()
    if (!refundValid) return
    const workerShare = Math.round((serviceFee - refund) * 100) / 100
    if (
      !window.confirm(
        `Resolve this dispute? The client is refunded ${formatMoney(refund)} and the worker is paid ${formatMoney(workerShare)}. This can't be undone.`,
      )
    ) {
      return
    }
    await act(() =>
      apiRequest(`/admin/disputes/${selectedId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          refundAmount: Math.round(refund * 100) / 100,
          ...(resolutionNote.trim() ? { resolutionNote: resolutionNote.trim() } : {}),
        }),
      }),
    )
  }

  const columns = [
    {
      key: 'reason',
      label: 'Complaint / Reason',
      render: (r) => <NameCell name={r.reason || 'Dispute'} sub={r.description} avatarChar="!" />,
    },
    {
      key: 'job',
      label: 'Job',
      render: (r) => (
        <div>
          <p className="font-semibold text-primary">{r.job?.jobCode || '—'}</p>
          {r.job?.status && <p className="admin-cell-sub">{r.job.status.replace(/_/g, ' ')}</p>}
        </div>
      ),
    },
    {
      key: 'parties',
      label: 'Client / Worker',
      render: (r) => (
        <div>
          <p className="admin-cell-strong">{r.client?.fullName || '—'}</p>
          <p className="admin-cell-sub">{r.worker?.fullName || 'No worker assigned'}</p>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Reported',
      render: (r) => <span>{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill status={r.status} />
          {r.hasResponse && r.status !== 'resolved' && <span className="admin-cell-sub">Evidence received</span>}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Arbitration',
      align: 'right',
      render: (r) => (
        <div className="admin-row-actions">
          {r.status === 'resolved' ? (
            <button type="button" className="btn btn-sm btn-outline" onClick={() => openDetail(r)}>
              <Eye strokeWidth={2} /> View
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => openDetail(r)}>
              <Gavel strokeWidth={2} /> Review
            </button>
          )}
        </div>
      ),
    },
  ]

  const resolved = detail?.status === 'resolved'
  const jobDisputed = detail?.job?.status === 'disputed'
  const openRequestFor = (party) => detail?.requests?.some((q) => q.party === party && q.state === 'open')

  return (
    <div className="admin-page">
      <AdminHeader
        title="Disputes"
        count={pagination?.total ?? reports.length}
        subtitle="Gather evidence from both sides, then split the held service fee."
        actions={<RefreshButton onRefresh={loadReports} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search job code, client or worker contact"
        filters={FILTERS}
        filter={filter}
        onFilter={(value) => { setFilter(value); setPage(1) }}
        filterLabel="Filter by dispute status"
      />

      {loading && <p role="status">Loading disputes…</p>}
      {error && <p role="alert" className="text-rose-600">Couldn’t load disputes: {error}</p>}
      <AdminTable
        columns={columns}
        rows={reports}
        empty={error ? `Couldn't load disputes: ${error}` : 'No disputes match your filter.'}
      />

      <Pager page={page} totalPages={pagination?.totalPages ?? 1} onPage={setPage} />
      {selectedId && (
        <AdminModal
          size="max-w-3xl"
          title={`Dispute · Job ${detail?.job?.jobCode || '—'}`}
          subtitle={detail ? `Filed ${formatDateTime(detail.createdAt)}` : undefined}
          onClose={closeDetail}
          footer={
            <>
              {detail?.status === 'open' && (
                <button type="button" className="btn btn-outline sm:mr-auto" disabled={busy} onClick={markUnderReview}>
                  <SearchIcon strokeWidth={2} /> Mark under review
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={closeDetail}>
                Close
              </button>
            </>
          }
        >
          {actionError && <p role="alert" className="text-rose-600">{actionError} <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => loadDetail(selectedId)}>Refresh details</button></p>}
          {detailError && <p role="alert" className="text-[13px] text-rose-600">Couldn&apos;t load this dispute: {detailError} <button className="btn btn-sm btn-outline" onClick={() => loadDetail(selectedId)}>Retry</button></p>}
          {!detail && !detailError && <p className="text-[13px] text-muted">Loading…</p>}

          {detail && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                <StatusPill status={detail.status} />
                <span>Job status: {detail.job?.status?.replace(/_/g, ' ') || '—'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Party label="Client (filed the dispute)" person={detail.client} />
                <Party label="Worker" person={detail.worker} />
              </div>

              {detail.job?.description && (
                <div className="admin-info-box leading-relaxed text-dark-900">
                  <p className="admin-info-label">Job description</p>
                  {detail.job.description}
                </div>
              )}

              {detail.payment ? (
                <div className="admin-info-box">
                  <p className="admin-info-label">Payment</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
                    <p>Service fee <strong className="block text-dark-900">{formatMoney(detail.payment.serviceFee)}</strong></p>
                    <p>Platform fee <strong className="block text-dark-900">{formatMoney(detail.payment.platformFee)}</strong></p>
                    <p>Priority + tax <strong className="block text-dark-900">{formatMoney((detail.payment.priorityFee || 0) + (detail.payment.tax || 0))}</strong></p>
                    <p>Client paid <strong className="block text-dark-900">{formatMoney(detail.payment.total)}</strong></p>
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted">
                    Escrow: {detail.payment.escrowStatus?.replace(/_/g, ' ') || '—'}
                    {detail.payment.refundedAmount > 0 && ` · ${formatMoney(detail.payment.refundedAmount)} refunded`}
                  </p>
                </div>
              ) : (
                <p className="rounded-[14px] border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
                  No payment was found for this job, so it can&apos;t be resolved.
                </p>
              )}

              {detail.filing && <Submission title="Client's complaint" submission={detail.filing} />}

              {detail.requests?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="admin-field-label">Evidence requests</span>
                  {detail.requests.map((q) => (
                    <div key={q._id} className="admin-info-box">
                      <p className="text-[13px] text-dark-900">
                        <strong className="capitalize">{q.party}</strong> · asked {formatDateTime(q.requestedAt)} ·{' '}
                        {REQUEST_STATE_LABELS[q.state] || q.state}
                        {q.state === 'open' && ` (due ${formatDateTime(q.dueAt)})`}
                      </p>
                      {q.message && <p className="mt-1 text-[13px] text-muted">“{q.message}”</p>}
                      {q.response && (
                        <div className="mt-2">
                          <Submission title={`${q.party === 'worker' ? "Worker's" : "Client's"} answer`} submission={q.response} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {resolved && detail.resolution && (
                <div className="admin-info-box border-emerald-200 bg-emerald-50/50">
                  <p className="admin-info-label">Decision</p>
                  <p className="text-dark-900">
                    Client refunded <strong>{formatMoney(detail.resolution.refundAmount)}</strong> · worker paid{' '}
                    <strong>{formatMoney(detail.resolution.payoutAmount)}</strong>
                  </p>
                  {detail.resolution.note && <p className="mt-1 text-muted">“{detail.resolution.note}”</p>}
                  <p className="mt-1.5 text-[12px] text-muted">
                    {detail.resolution.resolvedBy?.fullName ? `By ${detail.resolution.resolvedBy.fullName} · ` : ''}
                    {formatDateTime(detail.resolution.resolvedAt)}
                  </p>
                </div>
              )}

              {!resolved && !jobDisputed && (
                <p className="rounded-[14px] border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
                  This job is no longer in the disputed state, so evidence can&apos;t be requested and the dispute can&apos;t
                  be resolved.
                </p>
              )}

              {!resolved && jobDisputed && (
                <form onSubmit={requestEvidence} className="admin-info-box flex flex-col gap-2">
                  <p className="admin-info-label">Request evidence</p>
                  <div className="admin-filters w-full" role="group" aria-label="Ask">
                    {['worker', 'client'].map((party) => (
                      <button
                        key={party}
                        type="button"
                        aria-pressed={evidenceParty === party}
                        className="admin-filter flex-1 capitalize"
                        onClick={() => setEvidenceParty(party)}
                      >
                        Ask the {party}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    className="admin-textarea"
                    placeholder="Optional message, e.g. Please share photos of the finished work."
                    value={evidenceMessage}
                    onChange={(e) => setEvidenceMessage(e.target.value)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-muted">
                      {openRequestFor(evidenceParty)
                        ? `The ${evidenceParty} already has an open request.`
                        : 'They are notified and have until the evidence window (Settings) ends to answer.'}
                    </span>
                    <button
                      type="submit"
                      className="btn btn-sm btn-outline"
                      disabled={busy || openRequestFor(evidenceParty)}
                    >
                      <MessageSquarePlus strokeWidth={2} /> Send request
                    </button>
                  </div>
                </form>
              )}

              {!resolved && jobDisputed && detail.payment && (
                <form onSubmit={resolve} className="admin-info-box flex flex-col gap-2">
                  <p className="admin-info-label">Resolve</p>
                  <p className="text-[12px] text-muted">
                    Split the {formatMoney(serviceFee)} service fee: the client gets the refund, the worker gets the
                    rest. Platform fee, priority fee and tax are never refunded.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="admin-unit-input">
                      <span>$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={serviceFee ?? undefined}
                        required
                        aria-label="Refund to client"
                        placeholder="0.00"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </label>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRefundAmount('0')}>
                      Pay worker in full
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRefundAmount(String(serviceFee))}>
                      Refund client in full
                    </button>
                  </div>
                  {refundValid && (
                    <p className="text-[13px] text-dark-900">
                      Client refund {formatMoney(refund)} · worker payout{' '}
                      {formatMoney(Math.round((serviceFee - refund) * 100) / 100)}
                    </p>
                  )}
                  <textarea
                    rows={3}
                    maxLength={1000}
                    className="admin-textarea"
                    placeholder="Resolution note (optional) — included in the notification to both sides."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary" disabled={busy || !refundValid}>
                      <Gavel strokeWidth={2} /> {busy ? 'Saving…' : 'Resolve dispute'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </AdminModal>
      )}
    </div>
  )
}

export default Disputes
