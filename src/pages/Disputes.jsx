import { useState, useEffect, useMemo } from 'react'
import { Gavel, Pencil } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'

const FILTERS = ['All', 'Pending', 'Resolved', 'Dismissed']

const Disputes = () => {
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedReport, setSelectedReport] = useState(null)
  const [resolutionStatus, setResolutionStatus] = useState('resolved')
  const [resolutionNote, setResolutionNote] = useState('')
  const [loading, setLoading] = useState(false)

  const loadReports = async () => {
    try {
      const res = await apiRequest('/reports')
      setReports(res?.data?.reports || [])
    } catch (err) {
      console.warn('Failed to load reports:', err)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const handleOpenResolve = (rep) => {
    setSelectedReport(rep)
    setResolutionStatus(rep.status === 'dismissed' ? 'dismissed' : 'resolved')
    setResolutionNote(rep.resolutionNote || '')
  }

  const handleConfirmResolve = async (e) => {
    e.preventDefault()
    if (!resolutionNote.trim()) {
      alert('Please enter an administrative resolution note')
      return
    }
    setLoading(true)
    try {
      await apiRequest(`/reports/${selectedReport._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resolutionStatus,
          resolutionNote: resolutionNote.trim(),
        }),
      })
      setSelectedReport(null)
      loadReports()
    } catch (err) {
      alert(err.message || 'Resolution failed')
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reports.filter((r) => {
      let matchesFilter = true
      if (filter === 'Pending') matchesFilter = r.status === 'pending'
      else if (filter === 'Resolved') matchesFilter = r.status === 'resolved'
      else if (filter === 'Dismissed') matchesFilter = r.status === 'dismissed'

      const reason = r.reason || ''
      const reporter = r.reportedBy?.fullName || ''
      const jobCode = r.job?.jobCode || ''
      const matchesQuery = !q || [reason, reporter, jobCode].some((f) => f.toLowerCase().includes(q))

      return matchesFilter && matchesQuery
    })
  }, [reports, query, filter])

  const columns = [
    {
      key: 'reason',
      label: 'Complaint / Reason',
      render: (r) => (
        <NameCell
          name={r.reason}
          sub={r.description}
          avatarChar="!"
        />
      ),
    },
    {
      key: 'reporter',
      label: 'Reported By',
      render: (r) => <span className="admin-cell-strong">{r.reportedBy?.fullName || 'User'}</span>,
    },
    {
      key: 'job',
      label: 'Job Reference',
      render: (r) => (
        <span className="font-semibold text-primary">
          {r.job?.jobCode || 'Job Order'}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'Reported Date',
      render: (r) => (
        <span>
          {r.createdAt
            ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </span>
      ),
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
          {r.status === 'pending' ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleOpenResolve(r)}>
              <Gavel strokeWidth={2} /> Take action
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleOpenResolve(r)}>
              <Pencil strokeWidth={2} /> Edit note
            </button>
          )}
        </div>
      ),
    },
  ]

  const pendingCount = reports.filter((r) => r.status === 'pending').length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Disputes & Reports"
        count={reports.length}
        subtitle={`${pendingCount} claims awaiting arbitration. Review conflict details and record administrative resolutions.`}
        actions={<RefreshButton onRefresh={loadReports} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search claim, user or job code"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by report status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty="No dispute reports match your filter."
      />

      {selectedReport && (
        <AdminModal
          as="form"
          onSubmit={handleConfirmResolve}
          title="Arbitrate claim"
          subtitle={`Job #${selectedReport.job?.jobCode || '—'} · reported by ${selectedReport.reportedBy?.fullName || 'User'}`}
          onClose={() => setSelectedReport(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedReport(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Confirm resolution'}
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

          <div className="flex flex-col gap-1.5">
            <span className="admin-field-label">Decision</span>
            <div className="admin-filters w-full" role="group" aria-label="Decision">
              <button
                type="button"
                aria-pressed={resolutionStatus === 'resolved'}
                className="admin-filter flex-1"
                onClick={() => setResolutionStatus('resolved')}
              >
                Resolve (accept claim)
              </button>
              <button
                type="button"
                aria-pressed={resolutionStatus === 'dismissed'}
                className="admin-filter flex-1"
                onClick={() => setResolutionStatus('dismissed')}
              >
                Dismiss (reject claim)
              </button>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="admin-field-label">Resolution note</span>
            <textarea
              rows={4}
              className="admin-textarea"
              placeholder="Explain the verdict for both customer and tradesperson…"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              required
            />
          </label>
        </AdminModal>
      )}
    </div>
  )
}

export default Disputes
