import { useState, useEffect, useMemo } from 'react'
import { Eye, Check, X, ShieldCheck, FileWarning } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest, apiRequestAll } from '../api/client'

const EXPERIENCE_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const tradeNames = (p) => (p.services || []).map((s) => s.categoryName).filter(Boolean)

/**
 * The queue endpoint returns pending profiles only, with `user` as a bare id and no ID-document
 * files. Worker names/contact details are joined in from the admin user list.
 */
const Verifications = () => {
  const [profiles, setProfiles] = useState([])
  const [query, setQuery] = useState('')
  const [inspectProfile, setInspectProfile] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      const [queue, workers] = await Promise.all([
        apiRequestAll('/admin/workers/verification-queue', 'profiles'),
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
    loadData()
  }, [])

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

  const handleApprove = (workerUserId) => review(workerUserId, { status: 'approved' })

  const handleReject = (workerUserId) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason')
      return
    }
    review(workerUserId, { status: 'rejected', rejectionReason: rejectionReason.trim() })
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
      key: 'experience',
      label: 'Experience',
      align: 'right',
      render: (p) => <span>{p.yearsExperience ? `${p.yearsExperience} yrs` : '—'}</span>,
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
          <button
            type="button"
            className="btn btn-sm btn-success"
            disabled={loading}
            onClick={() => handleApprove(p.user)}
          >
            <Check strokeWidth={2} /> Approve
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminHeader
        title="Verification Queue"
        count={profiles.length}
        subtitle="Workers awaiting identity review, oldest first. Approving grants the verified badge and +20 trust score."
        actions={<RefreshButton onRefresh={loadData} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search worker name, email, phone or trade"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={error ? `Couldn't load the verification queue: ${error}` : 'No workers are waiting for verification.'}
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
                  onClick={() => handleReject(inspectProfile.user)}
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
                  onClick={() => handleApprove(inspectProfile.user)}
                >
                  <ShieldCheck strokeWidth={2} /> Approve &amp; grant badge
                </button>
              </>
            )
          }
        >
          <div className="flex items-start gap-2.5 rounded-[14px] border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
            <FileWarning className="size-4 shrink-0 mt-0.5" />
            <p>
              ID front, back and selfie images aren&apos;t included in the verification queue response, so they
              can&apos;t be shown here yet.
            </p>
          </div>

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
                  <li key={s.category || i} className="admin-badge">
                    {s.categoryName || 'Unknown trade'}
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
