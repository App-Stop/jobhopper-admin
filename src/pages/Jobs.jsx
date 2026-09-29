import { useState, useEffect, useMemo } from 'react'
import { Eye, MapPin, Zap } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'

const FILTERS = ['All', 'Open', 'En Route', 'In Progress', 'Completed', 'Disputed']

const Jobs = () => {
  const [jobs, setJobs] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedJob, setSelectedJob] = useState(null)

  const loadJobs = async () => {
    try {
      const res = await apiRequest('/admin/jobs')
      setJobs(res?.data?.jobs || [])
    } catch (err) {
      console.warn('Failed to load jobs:', err)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((j) => {
      let matchesFilter = true
      const s = (j.status || '').toLowerCase()
      if (filter === 'Open') matchesFilter = s === 'open'
      else if (filter === 'En Route') matchesFilter = s === 'en_route'
      else if (filter === 'In Progress') matchesFilter = ['arrived', 'started'].includes(s)
      else if (filter === 'Completed') matchesFilter = ['completed', 'paid'].includes(s)
      else if (filter === 'Disputed') matchesFilter = s === 'disputed'

      const code = j.jobCode || ''
      const title = j.title || ''
      const client = j.client?.fullName || ''
      const worker = j.worker?.fullName || ''
      const matchesQuery = !q || [code, title, client, worker].some((f) => f.toLowerCase().includes(q))

      return matchesFilter && matchesQuery
    })
  }, [jobs, query, filter])

  const columns = [
    {
      key: 'job',
      label: 'Job Order',
      render: (j) => (
        <NameCell
          name={j.jobCode}
          sub={j.title || j.category?.name || 'Service Job'}
          avatarChar={j.category?.name?.[0] || 'J'}
        />
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (j) => <span className="admin-cell-strong">{j.client?.fullName || 'Client'}</span>,
    },
    {
      key: 'worker',
      label: 'Assigned Worker',
      render: (j) => (
        <span>{j.worker?.fullName ? j.worker.fullName : <em className="text-muted">Unassigned</em>}</span>
      ),
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
          <span className="text-[12px] font-semibold uppercase text-muted">{j.urgency || '—'}</span>
        ),
    },
    {
      key: 'budget',
      label: 'Escrow Amount',
      align: 'right',
      render: (j) => <span className="font-semibold text-primary">${j.finalAmount || j.budget}</span>,
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

  const activeCount = jobs.filter((j) => ['open', 'en_route', 'arrived', 'started'].includes(j.status)).length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Jobs & Orders"
        count={jobs.length}
        subtitle={`${activeCount} jobs in progress. Track orders from dispatch to completion and escrow release.`}
        actions={<RefreshButton onRefresh={loadJobs} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search job code, title, client or worker"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by job status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty="No jobs match your search."
      />

      {selectedJob && (
        <AdminModal
          title={selectedJob.jobCode}
          subtitle={selectedJob.title || selectedJob.category?.name}
          onClose={() => setSelectedJob(null)}
          footer={
            <>
              <p className="mr-auto text-[13px] text-muted">
                Escrow{' '}
                <span className="ml-1 text-[17px] font-bold tabular-nums text-primary">
                  ${selectedJob.finalAmount || selectedJob.budget}
                </span>
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedJob(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="flex items-center gap-2">
            <StatusPill status={selectedJob.status} />
            {selectedJob.urgency === 'asap' && (
              <span className="admin-status admin-status--pending">ASAP emergency</span>
            )}
          </div>

          {selectedJob.description && (
            <div className="admin-info-box bg-surface leading-relaxed text-dark-900">
              <p className="admin-info-label">Description</p>
              {selectedJob.description}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="admin-info-box">
              <p className="admin-info-label">Client</p>
              <p className="font-semibold text-dark-900">{selectedJob.client?.fullName || '—'}</p>
              <p className="text-[12px] text-muted">{selectedJob.client?.email}</p>
            </div>
            <div className="admin-info-box">
              <p className="admin-info-label">Worker</p>
              <p className="font-semibold text-dark-900">{selectedJob.worker?.fullName || 'Unassigned'}</p>
              <p className="text-[12px] text-muted">{selectedJob.worker?.email || 'Awaiting assignment'}</p>
            </div>
          </div>

          <div className="admin-info-box flex items-start gap-2.5">
            <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="admin-info-label">Service location</p>
              <p className="text-dark-900">{selectedJob.address?.fullAddress || 'Address on file'}</p>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

export default Jobs
