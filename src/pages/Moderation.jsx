import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, Pager, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import ListFilters from './ListFilters'
import { formatDateTime } from '../constants'

const STATUSES = ['All', 'open', 'under_review', 'resolved']
const label = (value) => value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const Person = ({ person }) => <div><NameCell name={person?.fullName || 'Unavailable account'} sub={[person?.email, person?.phone].filter(Boolean).join(' · ')} />{person?.isDeleted && <p>Deleted account</p>}{person?.isDeactivated && <p>Deactivated</p>}</div>

export default function Moderation({ kind }) {
  const tickets = kind === 'support-tickets'
  const title = tickets ? 'Support Tickets' : 'User Reports'
  const endpoint = `/admin/${kind}`
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [role, setRole] = useState('')
  const [reportFilters, setReportFilters] = useState({})
  const [reasons, setReasons] = useState([])
  const [optionsError, setOptionsError] = useState('')
  const [optionsAttempt, setOptionsAttempt] = useState(0)
  useEffect(() => {
    if (tickets) return
    const controller = new AbortController()
    setOptionsError('')
    apiRequest('/admin/field-options', { signal: controller.signal }).then((res) => {
      if (!controller.signal.aborted) setReasons([...new Set(Object.values(res?.data?.userReportReasons || {}).flat())])
    }).catch((err) => { if (!controller.signal.aborted) setOptionsError(err.message) })
    return () => controller.abort()
  }, [tickets, optionsAttempt])
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const listId = useRef(0)
  const detailId = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    const id = ++listId.current
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page, limit: 25 })
    if (search) params.set('search', search)
    if (status !== 'All') params.set('status', status)
    if (role && !tickets) params.set('reporterRole', role)
    if (!tickets) Object.entries(reportFilters).forEach(([key, value]) => { if (value) params.set(key, value) })
    try {
      const res = await apiRequest(`${endpoint}?${params}`)
      if (!Array.isArray(res?.data?.[tickets ? 'tickets' : 'reports'])) throw new Error('Unexpected response from the server.')
      if (id !== listId.current) return
      setRows(res.data[tickets ? 'tickets' : 'reports'])
      setCounts(res.data.counts || {})
      setPagination(res.data.pagination)
      if (page > Math.max(1, res.data.pagination?.totalPages || 1)) setPage(Math.max(1, res.data.pagination?.totalPages || 1))
    } catch (err) {
      if (id === listId.current) setError(err.message)
    } finally {
      if (id === listId.current) setLoading(false)
    }
  }, [endpoint, page, search, status, role, tickets, reportFilters])

  const invalidateList = useCallback(() => { listId.current++ }, [])
  useEffect(() => { load(); return invalidateList }, [load, invalidateList])
  useEffect(() => () => { detailId.current++ }, [])

  const open = async (row) => {
    const id = ++detailId.current
    setSelected(row)
    setDetail(null)
    setDetailError('')
    setActionError('')
    setSuccess('')
    setNote('')
    try {
      const res = await apiRequest(`${endpoint}/${row._id}`)
      if (!res?.data?._id) throw new Error('Unexpected response from the server.')
      if (id === detailId.current) setDetail(res.data)
    } catch (err) {
      if (id === detailId.current) setDetailError(err.message)
    }
  }
  const close = () => {
    if (busy.current) return
    detailId.current++
    setSelected(null)
  }
  const update = async (nextStatus) => {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setActionError('')
    setSuccess('')
    try {
      const res = await apiRequest(`${endpoint}/${selected._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, ...(nextStatus === 'resolved' && note.trim() ? { resolutionNote: note.trim() } : {}) }),
      })
      if (!res?.data?._id) throw new Error('Unexpected response. Refresh the details to check whether the change was saved.')
      setDetail(res.data)
      setNote('')
      setSuccess(nextStatus === 'resolved' ? 'Resolved successfully.' : 'Marked under review.')
      await load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const columns = [
    { key: 'subject', label: tickets ? 'Subject' : 'Reason', render: (row) => <span className="admin-cell-strong">{tickets ? row.subject : row.reason}</span> },
    { key: 'person', label: tickets ? 'User' : 'Reporter', render: (row) => <Person person={tickets ? row.user : row.reportedBy} /> },
    ...(!tickets ? [{ key: 'reported', label: 'Reported user', render: (row) => <Person person={row.reportedUser} /> }] : []),
    { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
    { key: 'created', label: 'Created', render: (row) => formatDateTime(row.createdAt) },
    { key: 'action', label: 'Details', render: (row) => <button className="btn btn-sm btn-outline" onClick={() => open(row)}>View</button> },
  ]
  return <div className="admin-page">
    <AdminHeader title={title} count={pagination?.total ?? rows.length} subtitle={tickets ? 'Review support requests and send a resolution answer to the user.' : 'Review reports about people. Resolving a report does not deactivate the account.'} actions={<RefreshButton onRefresh={load} />} />
    <AdminToolbar query={query} onQuery={setQuery} placeholder={tickets ? 'Search subject, name, email or phone' : 'Search reporter or reported user'} filters={STATUSES} filter={status} onFilter={(value) => { setStatus(value); setPage(1) }} filterLabel="Filter by status" renderFilter={(value) => `${label(value)} (${value === 'All' ? Object.values(counts).reduce((sum, n) => sum + n, 0) : counts[value] ?? 0})`} />
    {!tickets && <label>Reporter role <select className="admin-filter" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}><option value="">All roles</option><option value="client">Client</option><option value="worker">Worker</option></select></label>}
    {!tickets && <ListFilters fields={[{ key: 'reason', label: 'Reason', options: reasons }, { key: 'reportedUserId', label: 'Reported account ID', pattern: '[a-fA-F0-9]{24}', title: '24-character account ID' }]} onApply={(values) => { setReportFilters(values); setPage(1) }} />}
    {optionsError && <p role="alert" className="text-rose-600">Couldn’t load report reasons: {optionsError} <button className="btn btn-sm btn-outline" onClick={() => setOptionsAttempt((value) => value + 1)}>Retry</button></p>}
    {error && <p role="alert" className="text-rose-600">Couldn’t load {title.toLowerCase()}: {error} <button className="btn btn-sm btn-outline" onClick={load}>Retry</button></p>}
    {loading && <p role="status">Loading…</p>}
    <AdminTable columns={columns} rows={rows} empty={loading ? 'Loading…' : error ? 'Unable to load records.' : 'No records match your filters.'} />
    <Pager page={page} totalPages={pagination?.totalPages ?? 1} onPage={setPage} />
    {selected && <AdminModal title={tickets ? selected.subject : 'User report'} onClose={close} footer={<button className="btn btn-outline" disabled={saving} onClick={close}>Close</button>}>
      {detailError && <p role="alert" className="text-rose-600">{detailError} <button className="btn btn-sm btn-outline" onClick={() => open(selected)}>Retry</button></p>}
      {!detail && !detailError && <p role="status">Loading details…</p>}
      {detail && <>
        <StatusPill status={detail.status} />
        <Person person={tickets ? detail.user : detail.reportedBy} />
        {!tickets && <><p className="admin-info-label">Reported user</p><Person person={detail.reportedUser} /><p>Reporter role: {detail.reporterRole} · Other reports about this person: {detail.otherReportsCount}</p><p className="font-semibold">{detail.reason}</p></>}
        <p className="admin-info-box whitespace-pre-wrap break-words">{detail.description || 'No description provided.'}</p>
        <p>Created {formatDateTime(detail.createdAt)}</p>
        {detail.status === 'resolved' ? <div className="admin-info-box"><p className="admin-info-label">{tickets ? 'Answer to the user' : 'Internal resolution note'}</p><p className="whitespace-pre-wrap break-words">{detail.resolutionNote || 'No note provided.'}</p><p>Resolved by {detail.resolvedBy?.fullName || 'Administrator'} · {formatDateTime(detail.resolvedAt)}</p></div> : <form onSubmit={(e) => { e.preventDefault(); update('resolved') }} className="flex flex-col gap-3">
          <label>{tickets ? 'Answer shown to the user (optional)' : 'Internal note (optional; not shown to the reporter)'}<textarea className="w-full rounded-xl border border-line p-3" rows={4} maxLength={tickets ? 2000 : 1000} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} /></label>
          <p className="text-muted text-[12px]">{note.length}/{tickets ? 2000 : 1000} characters. Resolved records cannot be reopened or edited.</p>
          <div className="flex gap-2"><button type="button" className="btn btn-outline" disabled={saving || detail.status !== 'open'} onClick={() => update('under_review')}>Mark under review</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Resolve'}</button></div>
        </form>}
        {actionError && <p role="alert" className="text-rose-600">{actionError} <button className="btn btn-sm btn-outline" disabled={saving} onClick={() => open(selected)}>Refresh details</button></p>}
        {success && <p role="status" className="text-green-700">{success}</p>}
      </>}
    </AdminModal>}
  </div>
}
