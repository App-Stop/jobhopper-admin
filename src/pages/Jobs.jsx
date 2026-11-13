import { useState, useEffect, useRef } from 'react'
import { Eye, MapPin, Zap } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, Pager, FileImage, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import useAdminList from '../hooks/useAdminList'
import ListFilters from './ListFilters'
import { ACTIVE_JOB_STATUSES, JOB_STATUS_GROUPS as FILTER_STATUSES, categoryNames, formatDateTime as formatDate, formatMoney as money } from '../constants'

const FILTERS = ['All', ...Object.keys(FILTER_STATUSES).filter((key) => key !== 'Open')]

const URGENCY_LABELS = { standard: 'Standard', within_24h: 'Within 24h', asap: 'ASAP' }

const formatAddress = (a) =>
  a && typeof a === 'object'
    ? [a.street, a.apartment, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(', ') || '—'
    : '—'

// Agreed price once a worker is hired, otherwise the client's posted budget.
const jobAmount = (j) => j.finalAmount ?? j.budget

const Jobs = () => {
  const [filter, setFilter] = useState('All')
  const [filters, setFilters] = useState({})
  const { rows: jobs, counts, pagination, query, setQuery, page, setPage, error, loading, refresh: loadJobs } = useAdminList('/admin/jobs', 'jobs', { ...filters, status: filters.status?.length ? filters.status.join(',') : filter === 'All' ? '' : FILTER_STATUSES[filter].join(',') })
  const [selectedJob, setSelectedJob] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const detailRequest = useRef(0)

  useEffect(() => () => { detailRequest.current++ }, [])
  const closeDetail = () => { detailRequest.current++; setSelectedJob(null) }
  const openDetail = async (job) => {
    const id = ++detailRequest.current
    setSelectedJob(job)
    setDetailLoading(true)
    setDetailError('')
    try {
      const res = await apiRequest(`/admin/jobs/${job._id}`)
      if (!res?.data?._id) throw new Error('Unexpected response from the server.')
      if (id === detailRequest.current) setSelectedJob(res.data)
    } catch (err) {
      if (id === detailRequest.current) setDetailError(err.message)
    } finally {
      if (id === detailRequest.current) setDetailLoading(false)
    }
  }


  const columns = [
    {
      key: 'job',
      label: 'Job Order',
      render: (j) => (
        <NameCell
          name={j.jobCode || 'Job'}
          sub={j.title || categoryNames(j).join(', ') || 'Service Job'}
          avatarChar={categoryNames(j)[0]?.[0] || 'J'}
        />
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (j) => <span className="admin-cell-strong">{j.client?.fullName || '—'}</span>,
    },
    {
      key: 'worker',
      label: 'Assigned Worker',
      render: (j) =>
        j.worker?.fullName ? <span>{j.worker.fullName}</span> : <em className="text-muted">Unassigned</em>,
    },
    {
      key: 'urgency',
      label: 'Urgency',
      render: (j) =>
        j.urgency === 'asap' ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase text-amber-700">
            <Zap className="size-3.5" strokeWidth={2} /> ASAP
          </span>
        ) : (
          <span className="text-[12px] font-semibold uppercase text-muted">
            {URGENCY_LABELS[j.urgency] || j.urgency || '—'}
          </span>
        ),
    },
    {
      key: 'amount',
      label: 'Job Amount',
      align: 'right',
      render: (j) => <span className="font-semibold text-primary">{money(jobAmount(j))}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (j) => <StatusPill status={j.status} />,
    },
    {
      key: 'action',
      label: 'Details',
      align: 'right',
      render: (j) => (
        <div className="admin-row-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => openDetail(j)}>
            <Eye strokeWidth={2} /> View
          </button>
        </div>
      ),
    },
  ]

  const activeCount = ACTIVE_JOB_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0)

  return (
    <div className="admin-page">
      <AdminHeader
        title="Jobs"
        count={pagination?.total ?? jobs.length}
        subtitle={`${activeCount} jobs booked, in progress or awaiting the client's confirmation. Track orders from dispatch to completion and escrow release.`}
        actions={<RefreshButton onRefresh={loadJobs} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search job code, description, client or worker contact"
        filters={FILTERS}
        filter={filter}
        onFilter={(value) => { setFilter(value); setFilters((old) => ({ ...old, status: [] })); setPage(1) }}
        filterLabel="Filter by job status"
      />

      <ListFilters fields={[
        { key: 'status', label: 'Exact statuses (multiple)', multiple: true, options: Object.values(FILTER_STATUSES).flat().filter((status) => status !== 'open') },
        { key: 'postType', label: 'Post type', options: ['open', 'direct_hire'] },
        { key: 'urgency', label: 'Urgency', options: ['standard', 'within_24h', 'asap'] },
        { key: 'from', label: 'Created from', type: 'date' }, { key: 'to', label: 'Created to', type: 'date' },
        { key: 'scheduledFrom', label: 'Scheduled from', type: 'date' }, { key: 'scheduledTo', label: 'Scheduled to', type: 'date' },
      ]} onApply={(values) => { setFilters(values); setFilter('All'); setPage(1) }} />
      {loading && <p role="status">Loading jobs…</p>}
      {error && <p role="alert" className="text-rose-600">Couldn’t load jobs: {error}</p>}
      <AdminTable
        columns={columns}
        rows={jobs}
        empty={error ? `Couldn't load jobs: ${error}` : 'No jobs match your search.'}
      />

      <Pager page={page} totalPages={pagination?.totalPages ?? 1} onPage={setPage} />
      {selectedJob && (
        <AdminModal
          title={selectedJob.jobCode || 'Job'}
          subtitle={[selectedJob.title, categoryNames(selectedJob).join(', ')].filter(Boolean).join(' · ')}
          onClose={closeDetail}
          footer={
            <>
              <p className="mr-auto text-[13px] text-muted">
                {selectedJob.finalAmount !== null && selectedJob.finalAmount !== undefined ? 'Agreed price' : 'Budget'}
                <span className="ml-2 text-[17px] font-bold tabular-nums text-primary">
                  {money(jobAmount(selectedJob))}
                </span>
                {selectedJob.priorityFee > 0 && (
                  <span className="ml-1.5">+ {money(selectedJob.priorityFee)} priority</span>
                )}
              </p>
              <button type="button" className="btn btn-primary" onClick={closeDetail}>
                Close
              </button>
            </>
          }
        >
          {detailLoading && <p role="status">Loading job details…</p>}
          {detailError && <p role="alert" className="text-rose-600">Couldn’t load job details: {detailError} <button className="btn btn-sm btn-outline" onClick={() => openDetail(selectedJob)}>Retry</button></p>}
          {!detailLoading && !detailError && <>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={selectedJob.status} />
            {selectedJob.urgency && (
              <span className={`admin-status ${selectedJob.urgency === 'asap' ? 'admin-status--pending' : 'admin-status--inactive'}`}>
                {URGENCY_LABELS[selectedJob.urgency] || selectedJob.urgency}
              </span>
            )}
          </div>

          {selectedJob.description && (
            <div className="admin-info-box bg-surface leading-relaxed text-dark-900">
              <p className="admin-info-label">Description</p>
              {selectedJob.description}
            </div>
          )}

          {selectedJob.photos?.length > 0 && <div className="grid grid-cols-3 gap-2">{selectedJob.photos.map((photo) => <FileImage key={photo._id} file={photo} className="aspect-square" />)}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="admin-info-box">
              <p className="admin-info-label">Client</p>
              <p className="font-semibold text-dark-900">{selectedJob.client?.fullName || '—'}</p>
            </div>
            <div className="admin-info-box">
              <p className="admin-info-label">Worker</p>
              <p className="font-semibold text-dark-900">{selectedJob.worker?.fullName || 'Unassigned'}</p>
            </div>
            <div className="admin-info-box">
              <p className="admin-info-label">Posted</p>
              <p className="text-dark-900">{formatDate(selectedJob.createdAt)}</p>
            </div>
            <div className="admin-info-box">
              <p className="admin-info-label">Scheduled for</p>
              <p className="text-dark-900">{formatDate(selectedJob.scheduledAt)}</p>
            </div>
          </div>

          <div className="admin-info-box flex items-start gap-2.5">
            <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="admin-info-label">Service location</p>
              <p className="text-dark-900">{formatAddress(selectedJob.address)}</p>
            </div>
          </div>

          <div className="admin-info-box"><p className="admin-info-label">Lifecycle</p><div className="grid grid-cols-2 gap-3">{Object.entries({ requestExpiresAt: 'Request deadline', paymentExpiresAt: 'Payment deadline', confirmationExpiresAt: 'Confirmation deadline', arrivedAt: 'Arrived', startedAt: 'Started', completedAt: 'Completed', paidAt: 'Paid', updatedAt: 'Updated' }).map(([key, label]) => <div key={key}><p className="admin-info-label">{label}</p><p>{formatDate(selectedJob[key])}</p></div>)}</div></div>
          {selectedJob.payment ? <div className="admin-info-box">
            <p className="admin-info-label">Payment</p>
            <p>{selectedJob.payment.status || 'Unknown'} · Escrow: {selectedJob.payment.escrowStatus || '—'}</p>
            {['serviceFee', 'platformFee', 'priorityFee', 'tax', 'total', 'refundedAmount'].map((key) => <p key={key}>{({ serviceFee: 'Service fee', platformFee: 'Platform fee', priorityFee: 'Priority fee', tax: 'Tax', total: 'Total', refundedAmount: 'Refunded' })[key]}: {money(selectedJob.payment[key])}</p>)}
            {selectedJob.payment.refunds?.map((refund) => <p key={refund._id}>Refund {money(refund.total)} · {refund.status} · {formatDate(refund.createdAt)}</p>)}
          </div> : <p>No payment recorded.</p>}
          {selectedJob.cancellation && <div className="admin-info-box">
            <p className="admin-info-label">Cancellation</p>
            <p>{selectedJob.cancellation.role || 'Unknown role'} · {formatDate(selectedJob.cancellation.cancelledAt)}</p>
            <p>{selectedJob.cancellation.reason}</p><p className="whitespace-pre-wrap">{selectedJob.cancellation.description}</p>
            <p>Settlement: {selectedJob.cancellation.status || '—'} · Refund: {selectedJob.cancellation.refundStatus || '—'}</p>
            <p>Client refund: {money(selectedJob.cancellation.refundAmount)} · Worker amount: {money(selectedJob.cancellation.workerAmount)}</p>
            <p>Cancelled from: {selectedJob.cancellation.fromStatus || '—'} · Had payment: {selectedJob.cancellation.hadPayment == null ? '—' : selectedJob.cancellation.hadPayment ? 'Yes' : 'No'}</p>
            <p>Client refund percentage: {selectedJob.cancellation.clientRefundPercent == null ? '—' : `${selectedJob.cancellation.clientRefundPercent}%`}</p>
            <p>Retained platform fee: {money(selectedJob.cancellation.retainedPlatformFee)} · Priority fee: {money(selectedJob.cancellation.retainedPriorityFee)} · Tax: {money(selectedJob.cancellation.retainedTax)}</p>
            <p>Settled: {formatDate(selectedJob.cancellation.settledAt)}</p>
          </div>}
          {selectedJob.dispute && <div className="admin-info-box"><p className="admin-info-label">Dispute</p><StatusPill status={selectedJob.dispute.status} /><p>{selectedJob.dispute.reason}</p><p>Created {formatDate(selectedJob.dispute.createdAt)}</p></div>}
          <div className="admin-info-box"><p className="admin-info-label">Applicants ({selectedJob.applicants?.total ?? 0})</p>
            {selectedJob.applicants?.items?.map((applicant) => <div key={applicant._id} className="border-b border-line py-2"><p>{applicant.worker?.fullName || 'Unavailable account'} · {applicant.worker?.email}</p><StatusPill status={applicant.status} /><p>{applicant.proposedAmount != null ? money(applicant.proposedAmount) : 'No proposed amount'} · {formatDate(applicant.createdAt)}</p><p className="whitespace-pre-wrap">{applicant.note}</p></div>)}
          </div>
          <div className="admin-info-box"><p className="admin-info-label">Status history</p>
            {!selectedJob.statusHistory?.length && <p>No status history recorded.</p>}
            {selectedJob.statusHistory?.map((entry) => <div key={entry._id} className="border-b border-line py-2"><p>{entry.fromStatus || 'Created'} → {entry.toStatus}</p><p>{entry.changedBy?.fullName || 'System'} · {formatDate(entry.createdAt)}</p><p className="whitespace-pre-wrap">{entry.note}</p></div>)}
          </div>
          </>}

        </AdminModal>
      )}
    </div>
  )
}

export default Jobs
