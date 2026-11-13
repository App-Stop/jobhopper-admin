import { useEffect, useRef, useState } from 'react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, FileImage, NameCell, Pager, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import useAdminList from '../hooks/useAdminList'
import ListFilters from './ListFilters'
import { formatDateTime } from '../constants'
import { methodName, decision } from '../utils/verifications'

const TABS = { 'Pending review': 'pending', Verified: 'approved', Rejected: 'rejected', 'Not submitted': 'not_submitted', All: '' }
const STATUS_LABELS = { pending: { label: 'Pending review', modifier: 'pending' }, approved: { label: 'Verified', modifier: 'active' } }
const Photos = ({ documents = {}, small = false }) => <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {['front', 'back', 'face'].map((side) => <div key={side}>
    <p className="admin-info-label">{ { front: 'ID front', back: 'ID back', face: 'Face' }[side] }</p>
    {documents?.[side] ? <FileImage key={documents[side]._id || documents[side].location} file={documents[side]} alt={side} className={small ? 'h-24' : 'h-48'} /> : <div className={`${small ? 'h-24' : 'h-48'} flex items-center justify-center bg-fill rounded-xl text-muted`}>No photo</div>}
  </div>)}
</div>
const Summary = ({ record }) => <div className="grid grid-cols-2 gap-3">
  {[
    ['Method', methodName(record.method)], ['Country', record.documentCountry ?? '-'],
    ['Attempt', record.attemptNumber ?? '-'], ['Submitted', formatDateTime(record.submittedAt)],
    ['Decision', decision(record)], ['Verified badge', record.isVerifiedBadge ? 'Yes' : 'No'],
    ['Trust score', record.trustScore ?? '-'],
  ].map(([label, value]) => <div className="admin-info-box" key={label}><p className="admin-info-label">{label}</p><p>{value}</p></div>)}
</div>

export default function Verifications() {
  const [tab, setTab] = useState('Pending review')
  const [dates, setDates] = useState({})
  const list = useAdminList('/admin/verifications', 'verifications', { ...dates, status: TABS[tab] }, 20)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [notice, setNotice] = useState('')
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const request = useRef(0)
  const busy = useRef(false)
  useEffect(() => () => { request.current++ }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const close = () => {
    if (busy.current) return
    if (action) { setAction(null); return }
    request.current++
    setSelected(null)
    setDetail(null)
    setAction(null)
  }
  const loadDetail = async (id) => {
    const revision = ++request.current
    setDetailLoading(true)
    setDetailError('')
    try {
      const res = await apiRequest(`/admin/verifications/${id}`)
      if (!res?.data?._id) throw new Error('Unexpected verification response from the server.')
      if (request.current === revision) setDetail(res.data)
    } catch (err) {
      if (request.current !== revision) return
      if (err.status === 404) {
        setSelected(null)
        setDetail(null)
        setNotice(err.message)
        list.refresh()
      } else setDetailError(err.message)
    } finally {
      if (request.current === revision) setDetailLoading(false)
    }
  }
  const open = (row) => {
    if (busy.current) return
    setSelected(row._id)
    setDetail(null)
    setAction(null)
    setReviewError('')
    loadDetail(row._id)
  }
  const review = async (event) => {
    event.preventDefault()
    if (busy.current || !detail || !action || (action === 'rejected' && !reason.trim())) return
    busy.current = true
    setSaving(true)
    setReviewError('')
    try {
      const body = action === 'approved' ? { status: action } : { status: action, rejectionReason: reason.trim() }
      const res = await apiRequest(`/admin/verifications/${selected}`, { method: 'PATCH', body: JSON.stringify(body) })
      if (!res?.data?._id) throw new Error('Unexpected verification response from the server. Please reload the detail before retrying.')
      setDetail(res.data)
      setAction(null)
      setNotice(res.message || 'Verification reviewed successfully')
      list.refresh()
    } catch (err) {
      setReviewError(err.message)
      if (err.status === 400) { setAction(null); await loadDetail(selected); list.refresh() }
      if (err.status === 404) {
        setAction(null)
        setSelected(null)
        setDetail(null)
        setNotice(err.message)
        list.refresh()
      }
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  const columns = [
    { key: 'worker', label: 'Worker', render: (row) => <button type="button" className="text-left" onClick={(e) => { e.stopPropagation(); open(row) }} aria-label={`Review ${row.worker?.fullName || 'worker'}`}><NameCell name={row.worker?.fullName || 'Unnamed worker'} sub={row.worker?.email} /></button> },
    { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} overrides={STATUS_LABELS} /> },
    { key: 'method', label: 'Method', render: (row) => methodName(row.method) },
    { key: 'documentCountry', label: 'Country', render: (row) => row.documentCountry || '-' },
    { key: 'submittedAt', label: 'Submitted', render: (row) => formatDateTime(row.submittedAt) },
    { key: 'decision', label: 'Decision', render: decision },
  ]
  return <div className="admin-page">
    <AdminHeader title="Verification Queue" count={list.pagination?.total} subtitle="Review worker identity documents and submission history. Newest submissions appear first." actions={<RefreshButton onRefresh={list.refresh} />} />
    <AdminToolbar query={list.query} onQuery={list.setQuery} placeholder="Search worker name, email or phone" filters={Object.keys(TABS)} filter={tab} onFilter={(value) => { setTab(value); list.setPage(1) }} filterLabel="Verification status" renderFilter={(label) => `${label} (${label === 'All' ? Object.values(TABS).filter(Boolean).reduce((sum, key) => sum + (list.counts[key] || 0), 0) : list.counts[TABS[label]] || 0})`} />
    <ListFilters fields={[{ key: 'from', label: 'Submitted from', type: 'date' }, { key: 'to', label: 'Submitted to', type: 'date' }]} onApply={(values) => { setDates(values); list.setPage(1) }} />
    {notice && <p role="status">{notice}</p>}
    {list.loading && <p role="status">Loading verifications...</p>}
    {list.error && <p role="alert" className="text-rose-600">{list.error} <button type="button" className="btn btn-sm btn-outline" onClick={list.refresh}>Retry</button></p>}
    {!list.loading && !list.error && <AdminTable columns={columns} rows={list.rows} empty="No verifications found" onRowClick={open} />}
    <Pager page={list.page} totalPages={list.pagination?.totalPages || 1} onPage={list.setPage} />
    {selected && <AdminModal size="verification-drawer" title="Verification details" onClose={close} footer={<>
      <button type="button" className="btn btn-outline" disabled={saving} onClick={close}>Close</button>
      {detail && !detailLoading && !detailError && <>
        {detail.status !== 'approved' && <button type="button" className="btn btn-primary" disabled={saving} onClick={() => { setAction('approved'); setReviewError('') }}>Approve</button>}
        {detail.status !== 'rejected' && <button type="button" className="btn btn-danger" disabled={saving} onClick={() => { setAction('rejected'); setReason(''); setReviewError('') }}>Reject</button>}
      </>}
    </>}>
      {detailLoading && <p role="status">Loading verification...</p>}
      {detailError && <p role="alert" className="text-rose-600">{detailError} <button type="button" className="btn btn-outline" onClick={() => loadDetail(selected)}>Retry</button></p>}
      {reviewError && !action && <p role="alert" className="text-rose-600">{reviewError}</p>}
      {detail && !detailLoading && <>
        <NameCell name={detail.worker?.fullName || 'Unnamed worker'} sub={detail.worker?.email} />
        <p>{detail.worker?.phone || 'No phone'}</p>
        <div className="flex flex-wrap gap-2">{detail.worker?.profiles?.map((profile) => <span className="admin-badge" key={profile}>{profile}</span>)}{detail.worker?.isDeactivated && <StatusPill status="deactivated" />}</div>
        <StatusPill status={detail.status} overrides={STATUS_LABELS} />
        <Summary record={detail} />
        {detail.status === 'rejected' && detail.rejectionReason && <div className="admin-info-box"><p className="admin-info-label">Reason</p><p>{detail.rejectionReason}</p></div>}
        <h3 className="admin-card-title">Current photos</h3>
        <Photos documents={detail.documents} />
        <h3 className="admin-card-title">Attempt history</h3>
        {!detail.attempts?.length && <p>No attempt history.</p>}
        {detail.attempts?.map((attempt, index) => <section key={attempt._id || index} className="admin-info-box flex flex-col gap-3">
          <h4 className="font-semibold">Attempt {attempt.attemptNumber ?? '-'}</h4>
          <StatusPill status={attempt.status} />
          <p>{methodName(attempt.method)} · {attempt.documentCountry || '-'} · {formatDateTime(attempt.submittedAt)}</p>
          <p>Decision: {decision(attempt)}</p>
          {attempt.rejectionReason && <p>Reason: {attempt.rejectionReason}</p>}
          {attempt.veriffSessionId && <p className="break-all">Veriff session: {attempt.veriffSessionId}</p>}
          {attempt.veriffDecisionCode && <p>Veriff decision code: {attempt.veriffDecisionCode}</p>}
          <Photos documents={attempt.documents} small />
        </section>)}
      </>}
      {action && <AdminModal as="form" onSubmit={review} title={action === 'approved' ? 'Approve this worker?' : 'Reject this verification?'} onClose={() => { if (!busy.current) setAction(null) }} footer={<>
        <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setAction(null)}>Cancel</button>
        <button type="submit" className={action === 'approved' ? 'btn btn-primary' : 'btn btn-danger'} disabled={saving || detailLoading || !!detailError || (action === 'rejected' && !reason.trim())}>{saving ? 'Saving...' : reviewError ? 'Retry' : action === 'approved' ? 'Approve' : 'Reject'}</button>
      </>}>
        {action === 'approved' ? <p>The worker gets the verified badge and a notification.</p> : <label className="modal-field"><span className="modal-field-label">Reason</span><textarea autoFocus required className="modal-field-textarea" value={reason} onChange={(e) => setReason(e.target.value)} /><span className="text-muted">The worker sees this text.</span></label>}
        {reviewError && <p role="alert" className="text-rose-600">{reviewError}</p>}
      </AdminModal>}
    </AdminModal>}
  </div>
}
