import { useState, useEffect, useMemo } from 'react'
import { Eye, Check, X, ShieldCheck } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

const Verifications = () => {
  const [profiles, setProfiles] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Pending')
  const [inspectProfile, setInspectProfile] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    try {
      const res = await apiRequest('/admin/workers/verification-queue')
      setProfiles(res?.data?.profiles || [])
    } catch (err) {
      console.warn('Queue fetch error:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (workerUserId) => {
    setLoading(true)
    try {
      await apiRequest(`/admin/workers/${workerUserId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      })
      setInspectProfile(null)
      loadData()
    } catch (err) {
      alert(err.message || 'Approval failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (workerUserId) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason')
      return
    }
    setLoading(true)
    try {
      await apiRequest(`/admin/workers/${workerUserId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejectionReason: rejectionReason.trim() }),
      })
      setRejecting(false)
      setInspectProfile(null)
      setRejectionReason('')
      loadData()
    } catch (err) {
      alert(err.message || 'Rejection failed')
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return profiles.filter((p) => {
      const status = p.verification?.status || 'pending'
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Pending' && status === 'pending') ||
        (filter === 'Approved' && status === 'approved') ||
        (filter === 'Rejected' && status === 'rejected')

      const name = p.user?.fullName || ''
      const email = p.user?.email || ''
      const category = p.services?.[0]?.category?.name || ''
      const matchesQuery = !q || [name, email, category].some((f) => f.toLowerCase().includes(q))

      return matchesFilter && matchesQuery
    })
  }, [profiles, query, filter])

  const columns = [
    {
      key: 'name',
      label: 'Worker',
      render: (p) => (
        <NameCell
          name={p.user?.fullName || 'Worker'}
          sub={p.user?.email}
          avatarChar={p.user?.fullName?.[0]}
        />
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (p) => <span>{p.user?.phone || '—'}</span>,
    },
    {
      key: 'category',
      label: 'Trade Category',
      render: (p) => <span>{p.services?.[0]?.category?.name || 'General Trades'}</span>,
    },
    {
      key: 'hourlyRate',
      label: 'Rate',
      align: 'right',
      render: (p) => <span className="font-semibold">${p.hourlyRate}/hr</span>,
    },
    {
      key: 'trustScore',
      label: 'Trust Score',
      align: 'right',
      render: (p) => <span className="font-semibold text-emerald-700">{p.trustScore || 50}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <StatusPill status={p.verification?.status || 'pending'} />,
    },
    {
      key: 'actions',
      label: 'Review',
      align: 'right',
      render: (p) => (
        <div className="admin-row-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setInspectProfile(p)}>
            <Eye strokeWidth={2} /> Inspect
          </button>
          {p.verification?.status === 'pending' && (
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={loading}
              onClick={() => handleApprove(p.user?._id)}
            >
              <Check strokeWidth={2} /> Approve
            </button>
          )}
        </div>
      ),
    },
  ]

  const closeInspect = () => {
    setInspectProfile(null)
    setRejecting(false)
    setRejectionReason('')
  }

  const pendingCount = profiles.filter((p) => (p.verification?.status || 'pending') === 'pending').length

  const documents = inspectProfile
    ? [
        { label: 'ID Front', file: inspectProfile.verification?.idFrontFile, missing: 'No file' },
        { label: 'ID Back', file: inspectProfile.verification?.idBackFile, missing: 'Not applicable' },
        { label: 'Identity Selfie', file: inspectProfile.verification?.selfieFile, missing: 'No file' },
      ]
    : []

  return (
    <div className="admin-page">
      <AdminHeader
        title="Verification Queue"
        count={profiles.length}
        subtitle={`${pendingCount} awaiting review. Verify identity credentials to issue verified trust badges.`}
        actions={<RefreshButton onRefresh={loadData} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search worker name, email or trade"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty="No verification requests match your filter."
      />

      {inspectProfile && (
        <AdminModal
          size="max-w-2xl"
          title={`Verify credentials: ${inspectProfile.user?.fullName || 'Worker'}`}
          subtitle={
            <>
              ID type:{' '}
              <span className="font-semibold uppercase">
                {inspectProfile.verification?.idType || 'Government ID'}
              </span>
            </>
          }
          onClose={closeInspect}
          footer={
            rejecting ? (
              <>
                <button type="button" className="btn btn-outline" onClick={() => setRejecting(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger-solid"
                  disabled={loading}
                  onClick={() => handleReject(inspectProfile.user?._id)}
                >
                  <X strokeWidth={2} /> Confirm rejection
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-danger sm:mr-auto" onClick={() => setRejecting(true)}>
                  <X strokeWidth={2} /> Reject
                </button>
                <button type="button" className="btn btn-outline" onClick={closeInspect}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => handleApprove(inspectProfile.user?._id)}
                >
                  <ShieldCheck strokeWidth={2} /> Approve &amp; grant badge
                </button>
              </>
            )
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {documents.map(({ label, file, missing }, i) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-muted">
                  {i + 1}. {label}
                </span>
                <div className="aspect-[4/3] rounded-xl bg-surface border border-line overflow-hidden flex items-center justify-center">
                  {file?.url ? (
                    <a href={file.url} target="_blank" rel="noreferrer" className="size-full">
                      <img src={file.url} alt={label} className="size-full object-cover" />
                    </a>
                  ) : (
                    <span className="text-[12px] text-muted">{missing}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {rejecting && (
            <label className="flex flex-col gap-1.5">
              <span className="admin-field-label">Reason for rejection</span>
              <textarea
                rows={3}
                autoFocus
                className="admin-textarea"
                placeholder="e.g. ID photo corners are obscured. Please re-upload with clear lighting."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </label>
          )}
        </AdminModal>
      )}
    </div>
  )
}

export default Verifications
