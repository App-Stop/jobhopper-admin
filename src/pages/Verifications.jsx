import { useState, useEffect, useMemo } from 'react'
import { Eye, Check, X, ShieldCheck, FileWarning } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, FileImage, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest, apiRequestAll } from '../api/client'
import { formatDate, formatDateTime } from '../constants'

const EXPERIENCE_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }

// The queue lists pending, rejected and not-submitted workers together unless a status is given.
const FILTER_STATUSES = { Pending: 'pending', Rejected: 'rejected', 'Not Submitted': 'not_submitted', All: null }
const FILTERS = Object.keys(FILTER_STATUSES)

const tradeNames = (p) => (p.services || []).map((s) => s.category?.name).filter(Boolean)

/**
 * Queue profiles carry `user` as a bare id (no name/email), so worker contact details are joined
 * in from the admin user list. ID photos come with the profile under `verification.documents`.
 */
const Verifications = () => {
  const [profiles, setProfiles] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Pending')
  const [inspectProfile, setInspectProfile] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadData = async (status = FILTER_STATUSES[filter]) => {
    try {
      const [queue, workers] = await Promise.all([
        apiRequestAll('/admin/workers/verification-queue', 'profiles', status ? { status } : {}),
        apiRequestAll('/admin/users', 'users', { role: 'worker' }),
      ])
      const usersById = new Map(workers.map((u) => [u._id, u]))
      setProfiles(queue.map((p) => ({ ...p, account: usersById.get(p.user) || null })))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData(FILTER_STATUSES[filter])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const closeInspect = () => {
    setInspectProfile(null)
    setRejecting(false)
    setRejectionReason('')
  }

  // `workerUserId` is the worker's User id (profile.user), which is what the route expects.
  const review = async (workerUserId, body) => {
    setLoading(true)
    try {
      await apiRequest(`/admin/workers/${workerUserId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      closeInspect()
      loadData()
    } catch (err) {
      alert(err.message || 'Review failed')
    } finally {
      setLoading(false)
    }
  }

  // Approving a worker who never submitted ID photos is allowed by the backend, but deserves a check.
  const handleApprove = (p) => {
    if (
      p.verificationStatus === 'not_submitted' &&
      !window.confirm(`${workerName(p)} hasn't submitted any ID photos. Approve and grant the verified badge anyway?`)
    ) {
      return
    }
    review(p.user, { status: 'approved' })
  }

  const handleReject = (p) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason')
      return
    }
    review(p.user, { status: 'rejected', rejectionReason: rejectionReason.trim() })
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) =>
      [p.account?.fullName, p.account?.email, p.account?.phone, ...tradeNames(p)].some((f) =>
        (f || '').toLowerCase().includes(q),
      ),
    )
  }, [profiles, query])

  const workerName = (p) => p.account?.fullName || `Worker ···${String(p.user || '').slice(-6)}`

  // The backend refuses repeating the current decision, so a rejected worker can't be rejected again.
  const canReject = (p) => p.verificationStatus !== 'rejected'

  const columns = [
    {
      key: 'name',
      label: 'Worker',
      render: (p) => (
        <NameCell name={workerName(p)} sub={p.account?.email} avatarChar={p.account?.fullName?.[0] || 'W'} />
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (p) => <span>{p.account?.phone || '—'}</span>,
    },
    {
      key: 'trades',
      label: 'Trades',
      render: (p) => {
        const trades = tradeNames(p)
        return (
          <span className="block max-w-[220px] truncate" title={trades.join(', ')}>
            {trades.join(', ') || '—'}
          </span>
        )
      },
    },
    {
      key: 'submitted',
      label: 'Submitted',
      render: (p) => <span>{formatDate(p.verification?.submittedAt)}</span>,
    },
    {
      key: 'trustScore',
      label: 'Trust Score',
      align: 'right',
      render: (p) => <span className="font-semibold text-emerald-700">{p.trustScore ?? '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <StatusPill status={p.verificationStatus} />,
    },
    {
      key: 'actions',
      label: 'Review',
      align: 'right',
      render: (p) => (
        <div className="admin-row-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setInspectProfile(p)}>
            <Eye strokeWidth={2} /> Review
          </button>
          {p.verificationStatus === 'pending' && (
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={loading}
              onClick={() => handleApprove(p)}
            >
              <Check strokeWidth={2} /> Approve
            </button>
          )}
        </div>
      ),
    },
  ]

  const docs = inspectProfile?.verification?.documents || {}
  const hasDocs = !!(docs.front || docs.back || docs.face)

  return (
    <div className="admin-page">
      <AdminHeader
        title="Verification Queue"
        count={profiles.length}
        subtitle="Workers awaiting identity review, oldest first. Approving grants the verified badge and +20 trust score."
        actions={<RefreshButton onRefresh={() => loadData()} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search worker name, email, phone or trade"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by verification status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={error ? `Couldn't load the verification queue: ${error}` : 'No workers match this filter.'}
      />

      {inspectProfile && (
        <AdminModal
          size="max-w-2xl"
          title={`Review ${workerName(inspectProfile)}`}
          subtitle={[inspectProfile.account?.email, inspectProfile.account?.phone].filter(Boolean).join(' · ') || undefined}
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
                  onClick={() => handleReject(inspectProfile)}
                >
                  <X strokeWidth={2} /> Confirm rejection
                </button>
              </>
            ) : (
              <>
                {canReject(inspectProfile) && (
                  <button type="button" className="btn btn-danger sm:mr-auto" onClick={() => setRejecting(true)}>
                    <X strokeWidth={2} /> Reject
                  </button>
                )}
                <button type="button" className="btn btn-outline" onClick={closeInspect}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => handleApprove(inspectProfile)}
                >
                  <ShieldCheck strokeWidth={2} /> Approve &amp; grant badge
                </button>
              </>
            )
          }
        >
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <StatusPill status={inspectProfile.verificationStatus} />
            {inspectProfile.verification?.method && (
              <span className="admin-badge">
                {inspectProfile.verification.method === 'veriff' ? 'Checked by Veriff' : 'Manual review'}
              </span>
            )}
            {inspectProfile.verification?.submittedAt && (
              <span>Submitted {formatDateTime(inspectProfile.verification.submittedAt)}</span>
            )}
          </div>

          {inspectProfile.verification?.rejectionReason && (
            <div className="admin-info-box border-rose-200 bg-rose-50/50">
              <p className="admin-info-label">Previous rejection reason</p>
              <p className="text-dark-900">{inspectProfile.verification.rejectionReason}</p>
            </div>
          )}

          {hasDocs ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                ['ID front', docs.front],
                ['ID back', docs.back],
                ['Selfie', docs.face],
              ].map(([label, file]) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <span className="admin-info-label">{label}</span>
                  <FileImage file={file} alt={label} className="aspect-[4/3]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-[14px] border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
              <FileWarning className="size-4 shrink-0 mt-0.5" />
              <p>This worker hasn&apos;t submitted any ID photos.</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Experience', inspectProfile.yearsExperience ? `${inspectProfile.yearsExperience} yrs` : '—'],
              ['Trust score', inspectProfile.trustScore ?? '—'],
              ['Rating', inspectProfile.ratingCount ? `${inspectProfile.ratingAvg} (${inspectProfile.ratingCount})` : '—'],
              ['Jobs completed', inspectProfile.jobsCompleted ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="admin-info-box">
                <p className="admin-info-label">{label}</p>
                <p className="font-semibold text-dark-900 tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <div className="admin-info-box">
            <p className="admin-info-label">Trades</p>
            {inspectProfile.services?.length ? (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {inspectProfile.services.map((s, i) => (
                  <li key={s.category?._id || i} className="admin-badge">
                    {s.category?.name || 'Unknown trade'}
                    {s.experienceLevel && (
                      <span className="font-normal opacity-75">· {EXPERIENCE_LABELS[s.experienceLevel] || s.experienceLevel}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No trades listed</p>
            )}
          </div>

          {inspectProfile.bio && (
            <div className="admin-info-box bg-surface leading-relaxed text-dark-900">
              <p className="admin-info-label">Bio</p>
              {inspectProfile.bio}
            </div>
          )}

          <p className="text-[12px] text-muted">Profile created {formatDate(inspectProfile.createdAt)}</p>

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
              <span className="text-[12px] text-muted">Sent to the worker in their notification.</span>
            </label>
          )}
        </AdminModal>
      )}
    </div>
  )
}

export default Verifications
