import { useState, useEffect, useMemo } from 'react'
import { Gavel, Pencil } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest, apiRequestAll } from '../api/client'

// Backend report statuses: open → under_review → resolved | dismissed.
const FILTER_STATUSES = {
  Open: 'open',
  'Under Review': 'under_review',
  Resolved: 'resolved',
  Dismissed: 'dismissed',
}
const FILTERS = ['All', ...Object.keys(FILTER_STATUSES)]

const DECISIONS = [
  { status: 'under_review', label: 'Under review' },
  { status: 'resolved', label: 'Resolve (accept claim)' },
  { status: 'dismissed', label: 'Dismiss (reject claim)' },
]

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const Disputes = () => {
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedReport, setSelectedReport] = useState(null)
  const [resolutionStatus, setResolutionStatus] = useState('resolved')
  const [resolutionNote, setResolutionNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reports only carry the job id, so admin jobs are loaded alongside to show the job code and parties.
  const loadReports = async () => {
    try {
      const [list, jobs] = await Promise.all([
        apiRequestAll('/reports', 'reports'),
        apiRequestAll('/admin/jobs', 'jobs'),
      ])
      const jobsById = new Map(jobs.map((j) => [j._id, j]))
      setReports(list.map((r) => ({ ...r, jobInfo: jobsById.get(r.job) || null })))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const handleOpenResolve = (rep) => {
    setSelectedReport(rep)
    setResolutionStatus(rep.status === 'open' ? 'resolved' : rep.status)
    setResolutionNote(rep.resolutionNote || '')
  }

  const noteRequired = resolutionStatus !== 'under_review'

  const handleConfirmResolve = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiRequest(`/reports/${selectedReport._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resolutionStatus,
          ...(resolutionNote.trim() ? { resolutionNote: resolutionNote.trim() } : {}),
        }),
      })
      setSelectedReport(null)
      loadReports()
    } catch (err) {
      alert(err.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reports.filter((r) => {
      const matchesFilter = filter === 'All' || r.status === FILTER_STATUSES[filter]

      const fields = [
        r.reason,
        r.description,
        r.jobInfo?.jobCode,
        r.jobInfo?.client?.fullName,
        r.jobInfo?.worker?.fullName,
      ]
      const matchesQuery = !q || fields.some((f) => (f || '').toLowerCase().includes(q))

      return matchesFilter && matchesQuery
    })
  }, [reports, query, filter])

  const columns = [
    {
      key: 'reason',
      label: 'Complaint / Reason',
      render: (r) => <NameCell name={r.reason || 'Report'} sub={r.description} avatarChar="!" />,
    },
    {
      key: 'job',
      label: 'Job',
      render: (r) => (
        <div>
          <p className="font-semibold text-primary">{r.jobInfo?.jobCode || '—'}</p>
          {r.jobInfo?.title && <p className="admin-cell-sub max-w-[220px] truncate">{r.jobInfo.title}</p>}
        </div>
      ),
    },
    {
      key: 'parties',
      label: 'Client / Worker',
      render: (r) => (
        <div>
          <p className="admin-cell-strong">{r.jobInfo?.client?.fullName || '—'}</p>
          <p className="admin-cell-sub">{r.jobInfo?.worker?.fullName || 'No worker assigned'}</p>
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
      render: (r) => <StatusPill status={r.status} />,
    },
    {
      key: 'action',
      label: 'Arbitration',
      align: 'right',
      render: (r) => (
        <div className="admin-row-actions">
          {r.status === 'open' || r.status === 'under_review' ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleOpenResolve(r)}>
              <Gavel strokeWidth={2} /> Take action
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleOpenResolve(r)}>
              <Pencil strokeWidth={2} /> Edit decision
            </button>
          )}
        </div>
      ),
    },
  ]

  const openCount = reports.filter((r) => r.status === 'open' || r.status === 'under_review').length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Disputes & Reports"
        count={reports.length}
        subtitle={`${openCount} claims awaiting a decision. Review conflict details and record administrative resolutions.`}
        actions={<RefreshButton onRefresh={loadReports} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search reason, job code, client or worker"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by report status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={error ? `Couldn't load reports: ${error}` : 'No dispute reports match your filter.'}
      />

      {selectedReport && (
        <AdminModal
          as="form"
          onSubmit={handleConfirmResolve}
          title="Arbitrate claim"
          subtitle={`Job ${selectedReport.jobInfo?.jobCode || '—'} · reported ${formatDate(selectedReport.createdAt)}`}
          onClose={() => setSelectedReport(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedReport(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Save decision'}
              </button>
            </>
          }
        >
          <div className="admin-info-box bg-surface">
            <p className="admin-info-label">Issue</p>
            <p className="font-semibold text-dark-900">{selectedReport.reason}</p>
            {selectedReport.description && (
              <p className="mt-1 leading-relaxed text-muted">“{selectedReport.description}”</p>
            )}
          </div>

          {selectedReport.jobInfo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="admin-info-box">
                <p className="admin-info-label">Client</p>
                <p className="font-semibold text-dark-900">{selectedReport.jobInfo.client?.fullName || '—'}</p>
              </div>
              <div className="admin-info-box">
                <p className="admin-info-label">Worker</p>
                <p className="font-semibold text-dark-900">{selectedReport.jobInfo.worker?.fullName || 'Unassigned'}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="admin-field-label">Decision</span>
            <div className="admin-filters w-full" role="group" aria-label="Decision">
              {DECISIONS.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={resolutionStatus === status}
                  className="admin-filter flex-1"
                  onClick={() => setResolutionStatus(status)}
                >
                  {label}
                </button>
              ))}
            </div>
            {resolutionStatus !== 'under_review' && (
              <p className="text-[12px] text-muted">The reporter is notified when a claim is resolved or dismissed.</p>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="admin-field-label">
              Resolution note{!noteRequired && <span className="font-normal text-muted"> (optional)</span>}
            </span>
            <textarea
              rows={4}
              className="admin-textarea"
              placeholder="Explain the verdict for both customer and tradesperson…"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              required={noteRequired}
            />
          </label>
        </AdminModal>
      )}
    </div>
  )
}

export default Disputes
