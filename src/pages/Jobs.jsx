import { useState, useEffect, useMemo } from 'react'
import { Eye, MapPin, Zap } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequestAll } from '../api/client'
import { ACTIVE_JOB_STATUSES, JOB_STATUS_GROUPS as FILTER_STATUSES } from '../constants'

const FILTERS = ['All', ...Object.keys(FILTER_STATUSES)]

const URGENCY_LABELS = { standard: 'Standard', within_24h: 'Within 24h', asap: 'ASAP' }

const money = (v) =>
  v === null || v === undefined
    ? '—'
    : Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'

const formatAddress = (a) =>
  a && typeof a === 'object'
    ? [a.street, a.apartment, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(', ') || '—'
    : '—'

// Agreed price once a worker is hired, otherwise the client's posted budget.
const jobAmount = (j) => j.finalAmount ?? j.budget

const Jobs = () => {
  const [jobs, setJobs] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedJob, setSelectedJob] = useState(null)
  const [error, setError] = useState(null)

  const loadJobs = async () => {
    try {
      setJobs(await apiRequestAll('/admin/jobs', 'jobs'))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((j) => {
      const matchesFilter = filter === 'All' || FILTER_STATUSES[filter].includes(j.status)

      const fields = [j.jobCode, j.title, j.category?.name, j.client?.fullName, j.worker?.fullName]
      const matchesQuery = !q || fields.some((f) => (f || '').toLowerCase().includes(q))

      return matchesFilter && matchesQuery
    })
  }, [jobs, query, filter])

  const columns = [
    {
      key: 'job',
      label: 'Job Order',
      render: (j) => (
        <NameCell
          name={j.jobCode || 'Job'}
          sub={j.title || j.category?.name || 'Service Job'}
          avatarChar={j.category?.name?.[0] || 'J'}
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
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setSelectedJob(j)}>
            <Eye strokeWidth={2} /> View
          </button>
        </div>
      ),
    },
  ]

  const activeCount = jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)).length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Jobs & Orders"
        count={jobs.length}
        subtitle={`${activeCount} jobs booked or in progress. Track orders from dispatch to completion and escrow release.`}
        actions={<RefreshButton onRefresh={loadJobs} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search job code, title, trade, client or worker"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by job status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={error ? `Couldn't load jobs: ${error}` : 'No jobs match your search.'}
      />

      {selectedJob && (
        <AdminModal
          title={selectedJob.jobCode || 'Job'}
          subtitle={[selectedJob.title, selectedJob.category?.name].filter(Boolean).join(' · ')}
          onClose={() => setSelectedJob(null)}
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
              <button type="button" className="btn btn-primary" onClick={() => setSelectedJob(null)}>
                Close
              </button>
            </>
          }
        >
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

          {selectedJob.photos?.some((p) => p?.location) && (
            <div className="grid grid-cols-3 gap-2">
              {selectedJob.photos
                .filter((p) => p?.location)
                .map((p) => (
                  <a key={p._id} href={p.location} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl border border-line">
                    <img src={p.location} alt={p.filename || 'Job photo'} className="size-full object-cover" />
                  </a>
                ))}
            </div>
          )}

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

          {selectedJob.cancelReason && (
            <div className="admin-info-box border-rose-200 bg-rose-50/50">
              <p className="admin-info-label">Cancellation reason</p>
              <p className="text-dark-900">{selectedJob.cancelReason}</p>
            </div>
          )}
        </AdminModal>
      )}
    </div>
  )
}

export default Jobs
