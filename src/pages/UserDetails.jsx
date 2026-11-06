import { useCallback, useEffect, useState } from 'react'
import { AdminModal, FileImage, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import { categoryNames, formatDateTime, formatMoney } from '../constants'

const text = (value) => value == null || value === '' ? '—' : String(value).replace(/_/g, ' ')
const Field = ({ label, children }) => <div><dt className="admin-info-label">{label}</dt><dd className="whitespace-pre-wrap break-words">{children ?? '—'}</dd></div>
const Person = ({ label, person }) => <Field label={label}>{person ? <>{person.fullName || 'Unnamed account'}<br /><span className="text-muted">{[person.email, person.phone].filter(Boolean).join(' · ') || 'No contact details'}{person.isDeleted ? ' · Deleted account' : person.isDeactivated ? ' · Deactivated' : ''}</span></> : 'Unavailable account'}</Field>
const Stats = ({ values, labels }) => <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries(labels).map(([key, label]) => <div className="admin-info-box" key={key}><Field label={label}>{values?.[key] ?? '—'}</Field></div>)}</dl>

function ActivityRecord({ item, kind }) {
  return <article className="admin-info-box flex flex-col gap-3">
    <div className="flex flex-wrap justify-between gap-2"><strong>{kind === 'jobs' ? item.jobCode || 'Job' : kind === 'tickets' ? item.subject : item.job?.jobCode || text(kind)}</strong>{item.status && <StatusPill status={item.status} overrides={kind === 'payouts' ? { completed: { label: 'Paid out', modifier: 'active' } } : undefined} />}</div>
    <p className="text-[12px] text-muted">{formatDateTime(item.createdAt)} · ID: {item._id}</p>
    {item.role && <p>Role in this record: {text(item.role)}</p>}
    {kind === 'jobs' && <><p>{categoryNames(item).join(', ') || 'No categories'} · {text(item.urgency)}</p><Person label="Client" person={item.client} /><Person label="Worker" person={item.worker} /><dl className="grid grid-cols-2 gap-3"><Field label="Budget">{formatMoney(item.budget)}</Field><Field label="Agreed amount">{formatMoney(item.finalAmount)}</Field><Field label="Scheduled">{formatDateTime(item.scheduledAt)}</Field><Field label="City">{item.city}</Field><Field label="Escrow">{text(item.escrowStatus)}</Field><Field label="Post type">{text(item.postType)}</Field></dl></>}
    {kind === 'payments' && <><p>{text(item.type)} · Escrow: {text(item.escrowStatus)}</p><dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries({ serviceFee: 'Worker earnings', platformFee: 'Platform fee', priorityFee: 'Priority fee', tax: 'Tax', total: 'Total', refundedAmount: 'Refunded amount' }).map(([key, label]) => <Field key={key} label={label}>{formatMoney(item[key])}</Field>)}</dl></>}
    {kind === 'payouts' && <><dl className="grid grid-cols-3 gap-3"><Field label="Requested">{formatMoney(item.amount)}</Field><Field label="Fee">{formatMoney(item.fee)}</Field><Field label="Sent to bank">{formatMoney(item.payoutAmount)}</Field></dl><Field label="Bank account">{item.bankAccount ? [item.bankAccount.accountHolderName, item.bankAccount.accountType, item.bankAccount.last4 && `···${item.bankAccount.last4}`].filter(Boolean).join(' · ') : 'Unavailable'}</Field></>}
    {kind === 'disputes' && <><Person label="Client" person={item.client} /><Person label="Worker" person={item.worker} /><p>Job status: {text(item.job?.status)} · {item.awaitingResponse ? 'Awaiting response' : item.hasResponse ? 'Response received' : 'No response'}</p></>}
    {kind === 'reports' && <><Person label="Reporter" person={item.reportedBy} /><Person label="Reported user" person={item.reportedUser} /><p>Reporter role: {text(item.reporterRole)}</p></>}
    {kind === 'reviews' && <><Field label="Rating">{item.rating} / 5</Field><Person label="Other person" person={item.otherParty} /><p>{text(item.direction)}</p><p>{item.tags?.join(' · ') || 'No tags'}</p><Field label="Comment">{item.comment || 'No comment provided.'}</Field></>}
    {item.reason && <Field label="Reason">{item.reason}</Field>}
    {item.description && <Field label="Description">{item.description}</Field>}
    {item.expiryReason && <Field label="Expiry reason">{text(item.expiryReason)}</Field>}
    {item.resolvedAt && <Field label="Resolved">{formatDateTime(item.resolvedAt)}</Field>}
  </article>
}

export default function UserDetails({ userId, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState('overview')
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    apiRequest(`/admin/users/${userId}`, { signal: controller.signal })
      .then((res) => {
        if (!res?.data?.user?._id || !res.data.activity) throw new Error('Unexpected user details response from the server.')
        if (!controller.signal.aborted) setData(res.data)
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [userId, attempt])

  const user = data?.user
  const worker = data?.workerProfile
  const activity = data?.activity
  const groups = activity ? [
    { id: 'jobs', label: 'Jobs', kind: 'jobs', list: activity.jobs },
    { id: 'payments', label: 'Payments & refunds', kind: 'payments', list: activity.payments },
    ...(activity.payouts ? [{ id: 'payouts', label: 'Payouts', kind: 'payouts', list: activity.payouts }] : []),
    { id: 'disputesAgainst', label: 'Disputes against', kind: 'disputes', list: activity.disputes?.against },
    { id: 'disputesFiled', label: 'Disputes filed', kind: 'disputes', list: activity.disputes?.filed },
    { id: 'reviewsReceived', label: 'Reviews received', kind: 'reviews', list: activity.reviews?.received },
    { id: 'reviewsGiven', label: 'Reviews given', kind: 'reviews', list: activity.reviews?.given },
    { id: 'reportsAgainst', label: 'Reports against', kind: 'reports', list: activity.reports?.against },
    { id: 'reportsFiled', label: 'Reports filed', kind: 'reports', list: activity.reports?.filed },
    { id: 'tickets', label: 'Support tickets', kind: 'tickets', list: activity.tickets },
  ] : []
  const group = groups.find((value) => value.id === tab)
  return <AdminModal title={user?.fullName || 'User details'} subtitle={user?.email} size="max-w-4xl" onClose={onClose} footer={<><button className="btn btn-outline" disabled={loading} onClick={retry}>Refresh details</button><button className="btn btn-primary" onClick={onClose}>Close</button></>}>
    {loading && <p role="status">Loading user details…</p>}
    {error && <div role="alert" className="text-rose-600"><p>Couldn’t load user details: {error}</p><button className="btn btn-sm btn-outline" onClick={retry}>Retry</button></div>}
    {!loading && !error && data && <>
      <div className="flex flex-wrap items-center gap-3"><StatusPill status={user.isDeactivated ? 'deactivated' : 'active'} /><span>Profiles: {user.profiles?.join(' & ') || '—'}</span><span>Current app role: {text(user.activeRole)}</span></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="User details sections"><button className="admin-filter" aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>Overview</button>{groups.map((value) => <button key={value.id} className="admin-filter" aria-pressed={tab === value.id} onClick={() => setTab(value.id)}>{value.label} ({value.list?.total ?? '—'})</button>)}</div>
      {tab === 'overview' && <>
        <section className="admin-info-box"><h4 className="font-semibold mb-3">Account</h4><div className="flex flex-wrap gap-4">{user.profilePhoto && <FileImage key={user.profilePhoto._id} file={user.profilePhoto} alt={`${user.fullName || 'User'} profile photo`} className="size-24" />}<dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1"><Field label="Name">{user.fullName}</Field><Field label="Email">{user.email}</Field><Field label="Phone">{user.phone}</Field><Field label="Email verified">{user.isEmailVerified ? 'Yes' : 'No'}</Field><Field label="Phone verified">{user.isPhoneVerified ? 'Yes' : 'No'}</Field><Field label="Profile complete">{user.isProfileCompleted ? 'Yes' : 'No'}</Field><Field label="Joined">{formatDateTime(user.createdAt)}</Field><Field label="Updated">{formatDateTime(user.updatedAt)}</Field><Field label="Account ID">{user._id}</Field><Field label="Default address">{user.defaultAddress ? [user.defaultAddress.label, user.defaultAddress.street, user.defaultAddress.apartment, user.defaultAddress.city, user.defaultAddress.state, user.defaultAddress.zipCode, user.defaultAddress.country].filter(Boolean).join(', ') : 'No saved address'}</Field></dl></div></section>
        {data.clientProfile && <section><h4 className="font-semibold mb-3">Client profile</h4><Stats values={data.clientProfile.stats} labels={{ jobsPosted: 'Jobs posted', jobsCompleted: 'Jobs completed', activeJobs: 'Active jobs' }} /></section>}
        {worker ? <section className="flex flex-col gap-3"><h4 className="font-semibold">Worker profile</h4><div className="admin-info-box flex flex-col gap-3"><div className="flex items-center gap-3"><StatusPill status={worker.verificationStatus} /><span>Verified badge: {worker.isVerifiedBadge ? 'Yes' : 'No'}</span></div><Field label="Bio">{worker.bio || 'No bio provided.'}</Field><Field label="Services">{worker.services?.length ? worker.services.map((service, index) => <div key={service.category?._id || index}>{service.category?.name || 'Unavailable category'} · {text(service.experienceLevel)}</div>) : 'No services configured.'}</Field><Field label="Working days">{worker.workingDays?.join(', ') || 'Not configured'}</Field><Field label="Working hours">{worker.workingHours ? `${worker.workingHours.start} – ${worker.workingHours.end}` : 'Not configured'}</Field><Field label="Profile created">{formatDateTime(worker.createdAt)}</Field><Field label="Profile updated">{formatDateTime(worker.updatedAt)}</Field></div><Stats values={worker.stats} labels={{ pendingJobs: 'Pending jobs', completedJobs: 'Completed jobs', activeJobs: 'Active jobs', repeatCustomers: 'Repeat customers', ratingAvg: 'Average rating', ratingCount: 'Rating count' }} /></section> : user.profiles?.includes('worker') && <p>Worker profile details are unavailable.</p>}
      </>}
      {group && <section className="flex flex-col gap-3"><h4 className="font-semibold">{group.label}</h4>{group.list ? <><p className="text-muted text-[13px]">Showing {group.list.items?.length ?? 0} of {group.list.total} records, newest first. This view includes the latest 10 records.</p>{group.kind === 'jobs' && <p className="text-muted text-[13px]">Open requests are listed separately on the Open Requests page.</p>}{group.list.items?.length ? group.list.items.map((item) => <ActivityRecord key={item._id} item={item} kind={group.kind} />) : <p>No {group.label.toLowerCase()} recorded.</p>}</> : <p role="alert">This activity section is unavailable. Refresh the details to try again.</p>}</section>}
    </>}
  </AdminModal>
}
