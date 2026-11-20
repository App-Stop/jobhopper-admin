import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Plus, Send } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, Pager, RefreshButton, StatusPill } from './AdminParts'
import ListFilters from './ListFilters'
import { apiRequest } from '../api/client'
import useAdminList from '../hooks/useAdminList'
import { formatDateTime } from '../constants'
import {
  AUDIENCES, MESSAGE_MAX, NOTIFICATIONS_CHANGED_EVENT, POLL_MS, STATUS_LABELS, TITLE_MAX,
  audienceLabel, browserTimeZone, canHide, chunk, createBody, editBody, formatInZone, isValidTimeZone,
  isoToZonedInput, readRate, scheduleError, statusLabel, sumCounts, timeZoneOptions, zonedToIso,
} from '../utils/notifications'


const BASE = '/admin/notifications'
const TABS = { All: '', Scheduled: 'scheduled', Sending: 'processing', Sent: 'sent', Failed: 'failed', Cancelled: 'cancelled' }
const announce = (failed) => window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: failed === undefined ? {} : { failed } }))

const Info = ({ label, children }) => (
  <div className="admin-info-box">
    <p className="admin-info-label">{label}</p>
    <p className="break-words">{children}</p>
  </div>
)

const Counter = ({ value, max }) => (
  <span className={`text-[12px] tabular-nums ${value >= max ? 'text-rose-600' : 'text-muted'}`}>{value}/{max}</span>
)

// Create (no `original`) or edit a scheduled message (`original` = the row or detail). Has a review step.
function ComposeModal({ original, onClose, onSaved, onRequestError }) {
  const editing = !!original
  const initialZone = editing && isValidTimeZone(original.timezone) ? original.timezone : browserTimeZone()
  const [form, setForm] = useState(() => ({
    audience: original?.audience || 'workers',
    title: original?.title || '',
    message: original?.message || '',
    mode: editing ? 'schedule' : 'now',
    local: editing ? isoToZonedInput(original.scheduledFor, initialZone) : '',
    timeZone: initialZone,
    initialTimeZone: editing ? initialZone : undefined,
  }))
  const [step, setStep] = useState('form')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const zones = useMemo(() => timeZoneOptions(), [])
  const set = (key) => (event) => setForm((values) => ({ ...values, [key]: event.target.value }))

  // Returns the request body, or sets an error and returns null.
  const validate = () => {
    if (!AUDIENCES.some((a) => a.value === form.audience)) return fail('Choose an audience.')
    if (!form.title.trim()) return fail('Enter a title.')
    if (!form.message.trim()) return fail('Enter a message.')
    if (form.mode === 'schedule') {
      if (!isValidTimeZone(form.timeZone)) return fail('Enter a valid time zone, for example Asia/Karachi.')
      if (!zonedToIso(form.local, form.timeZone)) return fail('Pick a date and time.')
    }
    const body = editing ? editBody(original, form) : createBody(form)
    if (editing && !Object.keys(body).length) return fail('Change at least one field before saving.')
    if (body.scheduledFor) {
      const message = scheduleError(body.scheduledFor)
      if (message) return fail(message)
    }
    setError('')
    return body
  }
  const fail = (message) => { setError(message); return null }

  const review = (event) => {
    event.preventDefault()
    if (validate()) setStep('review')
  }
  const submit = async () => {
    if (busy.current) return
    const body = validate() // time passes on the review step; check the window again
    if (!body) { setStep('form'); return }
    busy.current = true
    setSaving(true)
    try {
      const res = await apiRequest(editing ? `${BASE}/${original._id}` : BASE, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      if (!res?.data?._id) throw new Error('Unexpected notification response from the server. Refresh the list before trying again.')
      onSaved(res)
    } catch (err) {
      if (editing && (err.status === 409 || err.status === 404)) onRequestError(err, original._id)
      else { setError(err.message); setStep('form') }
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  const close = () => { if (!busy.current) onClose() }

  const iso = form.mode === 'schedule' ? zonedToIso(form.local, form.timeZone) : null
  const localZone = browserTimeZone()
  const schedule = form.mode === 'schedule'
  const title = editing ? 'Edit scheduled notification' : 'New notification'

  if (step === 'review') {
    return <AdminModal size="max-w-lg" title={`Review: ${editing ? 'save changes' : schedule ? 'schedule' : 'send now'}`} onClose={close} footer={<>
      <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setStep('form')}>Back</button>
      <button type="button" className={schedule ? 'btn btn-primary' : 'btn btn-danger'} disabled={saving} onClick={submit}>
        {saving ? 'Saving...' : editing ? 'Save changes' : schedule ? 'Schedule' : <><Send strokeWidth={2} /> Send now</>}
      </button>
    </>}>
      <div className="flex flex-col gap-3">
        <Info label="Audience">{audienceLabel(form.audience)}</Info>
        <Info label="Title">{form.title.trim()}</Info>
        <div className="admin-info-box"><p className="admin-info-label">Message</p><p className="whitespace-pre-wrap break-words">{form.message.trim()}</p></div>
        <Info label="When">
          {schedule ? <>{formatInZone(iso, form.timeZone)} ({form.timeZone}){form.timeZone !== localZone && <><br /><span className="text-muted">Your time: {formatInZone(iso, localZone)}</span></>}</> : 'Right away'}
        </Info>
        {schedule
          ? <p className="text-muted text-[13px]">You can edit or cancel it until it starts sending.</p>
          : <p role="alert" className="admin-info-box text-rose-700">This message goes to real accounts right away. It cannot be stopped once you send it.</p>}
        {error && <p role="alert" className="text-rose-600">{error}</p>}
      </div>
    </AdminModal>
  }

  return <AdminModal as="form" onSubmit={review} size="max-w-lg" title={title} subtitle="Sent to every active account in the audience. Title and text only." onClose={close} footer={<>
    <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
    <button type="submit" className="btn btn-primary">Review</button>
  </>}>
    <div className="modal-fields">
      {error && <p role="alert" className="text-rose-600">{error}</p>}
      <fieldset className="modal-field">
        <legend className="sr-only">Audience</legend>
        <span className="modal-field-label">Audience</span>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => <label key={a.value} className="flex items-center gap-2 text-[14px] cursor-pointer">
            <input type="radio" name="audience" className="accent-primary" value={a.value} checked={form.audience === a.value} onChange={set('audience')} /> {a.label}
          </label>)}
        </div>
      </fieldset>
      <label className="modal-field">
        <span className="flex justify-between gap-2"><span className="modal-field-label">Title</span><Counter value={form.title.length} max={TITLE_MAX} /></span>
        <input className="modal-field-input" required autoFocus maxLength={TITLE_MAX} value={form.title} onChange={set('title')} placeholder="e.g. Maintenance tonight" />
      </label>
      <label className="modal-field">
        <span className="flex justify-between gap-2"><span className="modal-field-label">Message</span><Counter value={form.message.length} max={MESSAGE_MAX} /></span>
        <textarea className="modal-field-textarea" required rows={4} maxLength={MESSAGE_MAX} value={form.message} onChange={set('message')} placeholder="What should recipients know?" />
      </label>
      {!editing && <div className="admin-filters" role="group" aria-label="Send mode">
        {[['now', 'Send now'], ['schedule', 'Schedule']].map(([value, label]) => (
          <button key={value} type="button" className="admin-filter" aria-pressed={form.mode === value} onClick={() => setForm((values) => ({ ...values, mode: value }))}>{label}</button>
        ))}
      </div>}
      {schedule && <>
        <label className="modal-field">
          <span className="modal-field-label">Send date and time</span>
          <input className="modal-field-input" type="datetime-local" required value={form.local} onChange={set('local')} />
        </label>
        <label className="modal-field">
          <span className="modal-field-label">Time zone</span>
          <input className="modal-field-input" required list="notification-time-zones" value={form.timeZone} onChange={set('timeZone')} placeholder="Asia/Karachi" />
          <datalist id="notification-time-zones">{zones.map((zone) => <option key={zone} value={zone} />)}</datalist>
          <span className="text-[12px] text-muted">Between 1 minute and 1 year from now.{iso && form.timeZone !== localZone ? ` Your time: ${formatInZone(iso, localZone)}.` : ''}</span>
        </label>
      </>}
      {!schedule && <p className="text-[13px] text-muted">The message goes out as soon as you confirm on the next step.</p>}
    </div>
  </AdminModal>
}

export default function Notifications() {
  const [tab, setTab] = useState('All')
  const [hidden, setHidden] = useState(false)
  const [filters, setFilters] = useState({})
  const list = useAdminList(BASE, 'notifications', { ...filters, status: TABS[tab], hidden: hidden ? 'true' : '' }, 20)
  const [selected, setSelected] = useState(() => new Set())
  const [detailId, setDetailIdState] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [compose, setCompose] = useState(null) // { original? }
  const [confirm, setConfirm] = useState(null) // { kind: 'cancel' | 'hide', row?, ids? }
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [working, setWorking] = useState(false)
  const busy = useRef(false)
  const request = useRef(0)
  const detailRef = useRef(null)
  const setDetailId = (id) => { detailRef.current = id; setDetailIdState(id) }
  const { refresh } = list

  useEffect(() => () => { request.current++ }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  // Keep the sidebar's Failed badge in step with the visible list's counts.
  const failedCount = hidden ? undefined : list.counts.failed
  useEffect(() => { if (failedCount !== undefined) announce(failedCount) }, [failedCount])

  // Poll while a message is being sent.
  const processing = list.rows.some((row) => row.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const timer = setInterval(() => refresh({ silent: true }), POLL_MS)
    return () => clearInterval(timer)
  }, [processing, refresh])

  const notFound = (id) => {
    setNotice('Notification not found')
    if (detailRef.current === id) { request.current++; setDetailId(null); setDetail(null) }
    setCompose(null)
    setConfirm(null)
    refresh()
  }
  const changed = () => { refresh(); announce() }

  const loadDetail = async (id, { silent = false } = {}) => {
    const revision = ++request.current
    if (!silent) { setDetailLoading(true); setDetailError('') }
    try {
      const res = await apiRequest(`${BASE}/${id}`)
      if (!res?.data?._id) throw new Error('Unexpected notification response from the server.')
      if (request.current === revision) setDetail(res.data)
      return res.data
    } catch (err) {
      if (request.current !== revision) return null
      if (err.status === 404) notFound(id)
      else if (!silent) setDetailError(err.message)
      return null
    } finally {
      if (request.current === revision && !silent) setDetailLoading(false)
    }
  }
  const detailProcessing = detail?.status === 'processing'
  useEffect(() => {
    if (!detailProcessing || !detailId) return
    const timer = setInterval(() => loadDetail(detailId, { silent: true }), POLL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadDetail is recreated every render
  }, [detailProcessing, detailId])

  // 409: the server already started the message. Show its new status. 404: it is gone.
  const recover = async (err, id) => {
    setCompose(null)
    setConfirm(null)
    if (err.status === 404) { notFound(id); return }
    if (err.status !== 409) { setActionError(err.message); return }
    let fresh = null
    try { fresh = (await apiRequest(`${BASE}/${id}`))?.data } catch { /* the list refresh below still shows it */ }
    if (fresh?._id && detailRef.current === id) setDetail(fresh)
    setNotice(fresh?.status ? `This notification can no longer be changed. Its status is now ${statusLabel(fresh.status)}.` : 'This notification can no longer be changed.')
    changed()
  }

  const run = async (fn) => {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    setActionError('')
    try { await fn() } finally { busy.current = false; setWorking(false) }
  }
  const mutate = (row, action, success) => run(async () => {
    try {
      const res = await apiRequest(`${BASE}/${row._id}/${action}`, { method: 'POST' })
      if (!res?.data?._id) throw new Error('Unexpected notification response from the server.')
      if (detailRef.current === row._id) setDetail(res.data)
      setConfirm(null)
      setNotice(success)
      changed()
    } catch (err) {
      await recover(err, row._id)
    }
  })
  const cancel = (row) => mutate(row, 'cancel', 'Notification cancelled. It will not be sent.')
  const retry = (row) => mutate(row, 'retry', 'Retry scheduled. The server sends it within 5 seconds. Accounts that already got it do not get it again.')

  // Hide/unhide in groups of 100 ids (server limit) and compare `changed` with `requested`.
  const setVisibility = (ids, hide) => run(async () => {
    let requested = 0
    let changedCount = 0
    try {
      for (const group of chunk(ids)) {
        const res = await apiRequest(`${BASE}/${hide ? 'hide' : 'unhide'}`, { method: 'POST', body: JSON.stringify({ ids: group }) })
        requested += res?.data?.requested ?? group.length
        changedCount += res?.data?.changed ?? 0
      }
      const verb = hide ? 'Hid' : 'Showed again'
      const skipped = requested - changedCount
      setNotice(`${verb} ${changedCount} of ${requested} notification${requested === 1 ? '' : 's'}.${skipped > 0 ? ` ${skipped} did not match (already ${hide ? 'hidden' : 'visible'}, or the status changed).` : ''}`)
      setSelected(new Set())
      setConfirm(null)
      if (detailRef.current && ids.includes(detailRef.current)) loadDetail(detailRef.current, { silent: true })
    } catch (err) {
      setConfirm(null)
      setActionError(changedCount ? `${err.message} (${changedCount} changed before the error.)` : err.message)
    } finally {
      changed()
    }
  })

  const openDetail = (row) => {
    if (busy.current) return
    setDetailId(row._id)
    setDetail(null)
    setActionError('')
    loadDetail(row._id)
  }
  const closeDrawer = () => {
    if (busy.current) return
    if (compose || confirm) { setCompose(null); setConfirm(null); return }
    request.current++
    setDetailId(null)
    setDetail(null)
  }

  const onSaved = (res) => {
    const editedId = compose?.original?._id
    setCompose(null)
    setNotice(res.message || (editedId ? 'Notification updated' : 'Notification saved'))
    if (editedId && detailRef.current === editedId) setDetail(res.data)
    // A new message lands at the top of All/its status tab; jump there so the admin sees it.
    if (!editedId) {
      setHidden(false)
      setSelected(new Set())
      list.setPage(1)
      if (TABS[tab] && TABS[tab] !== res.data.status) setTab('All')
    }
    changed()
  }

  // Selection: finished rows in the normal list (to hide), every row in the Hidden view (to show again).
  const selectable = (row) => (hidden ? true : canHide(row))
  const selectableIds = list.rows.filter(selectable).map((row) => row._id)
  const selectedIds = selectableIds.filter((id) => selected.has(id))
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length
  const toggle = (id, on) => setSelected((current) => {
    const next = new Set(current)
    if (on) next.add(id)
    else next.delete(id)
    return next
  })
  const resetView = () => { setSelected(new Set()); list.setPage(1) }

  const stop = (event) => event.stopPropagation()
  const columns = [
    ...(selectableIds.length ? [{ key: 'select', label: 'Select', render: (row) => selectable(row) ? (
      <input type="checkbox" className="size-4 accent-primary cursor-pointer" aria-label={`Select ${row.title}`} checked={selected.has(row._id)} onClick={stop} onChange={(e) => toggle(row._id, e.target.checked)} />
    ) : null }] : []),
    { key: 'title', label: 'Message', render: (row) => <button type="button" className="text-left min-w-0 max-w-[320px]" onClick={(e) => { stop(e); openDetail(row) }}>
      <p className="admin-cell-strong truncate" title={row.title}>{row.title}</p>
      <p className="admin-cell-sub truncate" title={row.message}>{row.message}</p>
    </button> },
    { key: 'audience', label: 'Audience', render: (row) => audienceLabel(row.audience) },
    { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} overrides={STATUS_LABELS} /> },
    { key: 'scheduledFor', label: 'Send time', render: (row) => formatInZone(row.scheduledFor, row.timezone) },
    { key: 'delivery', label: 'Delivery', render: (row) => row.status === 'sent' ? <div>
      <p className="admin-cell-strong">{(row.recipients ?? 0).toLocaleString()} recipients</p>
      <p className="admin-cell-sub">Push {(row.pushSuccessCount ?? 0).toLocaleString()} ok · {(row.pushFailureCount ?? 0).toLocaleString()} refused</p>
    </div> : '-' },
    { key: 'createdBy', label: 'Created by', render: (row) => row.createdBy?.fullName || '-' },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex flex-wrap gap-2" onClick={stop}>
      {row.status === 'scheduled' && <>
        <button type="button" className="btn btn-sm btn-outline" disabled={working} onClick={() => setCompose({ original: row })}>Edit</button>
        <button type="button" className="btn btn-sm btn-outline" disabled={working} onClick={() => setConfirm({ kind: 'cancel', row })}>Cancel</button>
      </>}
      {row.status === 'failed' && <button type="button" className="btn btn-sm btn-primary" disabled={working} onClick={() => retry(row)}>Retry</button>}
      {!['scheduled', 'failed'].includes(row.status) && <span className="text-muted">-</span>}
    </div> },
  ]

  return <div className="admin-page">
    <AdminHeader
      title={hidden ? 'Hidden notifications' : 'Notifications'}
      count={list.pagination?.total}
      subtitle={hidden ? 'Messages hidden from the list. Recipients still have them in their app.' : 'Send a message to all workers, all clients, or everyone, now or at a set time.'}
      actions={<>
        <button type="button" className="btn btn-outline" aria-pressed={hidden} onClick={() => { setHidden((v) => !v); resetView() }}>
          {hidden ? <><Eye strokeWidth={2} /> Back to list</> : <><EyeOff strokeWidth={2} /> Hidden</>}
        </button>
        <RefreshButton onRefresh={list.refresh} />
        <button type="button" className="btn btn-primary" onClick={() => setCompose({})}><Plus strokeWidth={2} /> New notification</button>
      </>}
    />
    <AdminToolbar
      query={list.query} onQuery={list.setQuery} placeholder="Search title or message"
      filters={Object.keys(TABS)} filter={tab} filterLabel="Notification status"
      onFilter={(value) => { setTab(value); resetView() }}
      renderFilter={(label) => `${label} (${label === 'All' ? sumCounts(list.counts) : list.counts[TABS[label]] || 0})`}
    />
    <ListFilters fields={[
      { key: 'audience', label: 'Audience', options: AUDIENCES },
      { key: 'from', label: 'Send date from', type: 'date' },
      { key: 'to', label: 'Send date to', type: 'date' },
    ]} onApply={(values) => { setFilters(values); resetView() }} />
    {notice && <p role="status">{notice}</p>}
    {actionError && <p role="alert" className="text-rose-600">{actionError}</p>}
    {selectableIds.length > 0 && !list.loading && !list.error && <div className="flex flex-wrap items-center gap-3 text-[13px]">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="size-4 accent-primary" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? new Set(selectableIds) : new Set())} />
        Select all on this page
      </label>
      <span className="text-muted">{selectedIds.length} selected</span>
      {hidden
        ? <button type="button" className="btn btn-sm btn-outline" disabled={!selectedIds.length || working} onClick={() => setVisibility(selectedIds, false)}><Eye strokeWidth={2} /> Show selected</button>
        : <button type="button" className="btn btn-sm btn-outline" disabled={!selectedIds.length || working} onClick={() => setConfirm({ kind: 'hide', ids: selectedIds })}><EyeOff strokeWidth={2} /> Hide selected</button>}
    </div>}
    {list.loading && <p role="status">Loading notifications...</p>}
    {list.error && <p role="alert" className="text-rose-600">{list.error} <button type="button" className="btn btn-sm btn-outline" onClick={list.refresh}>Retry</button></p>}
    {!list.loading && !list.error && <AdminTable columns={columns} rows={list.rows} empty={hidden ? 'No hidden notifications' : 'No notifications found'} onRowClick={openDetail} />}
    <Pager page={list.page} totalPages={list.pagination?.totalPages || 1} onPage={(page) => { setSelected(new Set()); list.setPage(page) }} />

    {detailId && <AdminModal size="verification-drawer" title="Notification details" onClose={closeDrawer} footer={<>
      <button type="button" className="btn btn-outline" disabled={working} onClick={closeDrawer}>Close</button>
      {detail && !detailLoading && !detailError && <>
        {detail.status === 'scheduled' && <>
          <button type="button" className="btn btn-outline" disabled={working} onClick={() => setCompose({ original: detail })}>Edit</button>
          <button type="button" className="btn btn-danger" disabled={working} onClick={() => setConfirm({ kind: 'cancel', row: detail })}>Cancel notification</button>
        </>}
        {detail.status === 'failed' && <button type="button" className="btn btn-primary" disabled={working} onClick={() => retry(detail)}>Retry</button>}
        {canHide(detail) && <button type="button" className="btn btn-outline" disabled={working} onClick={() => setConfirm({ kind: 'hide', ids: [detail._id] })}><EyeOff strokeWidth={2} /> Hide</button>}
        {detail.isHidden && <button type="button" className="btn btn-outline" disabled={working} onClick={() => setVisibility([detail._id], false)}><Eye strokeWidth={2} /> Show again</button>}
      </>}
    </>}>
      {detailLoading && <p role="status">Loading notification...</p>}
      {detailError && <p role="alert" className="text-rose-600">{detailError} <button type="button" className="btn btn-outline" onClick={() => loadDetail(detailId)}>Retry</button></p>}
      {detail && !detailLoading && <>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={detail.status} overrides={STATUS_LABELS} />
          <span className="admin-badge">{audienceLabel(detail.audience)}</span>
          {detail.isHidden && <span className="admin-badge admin-badge--accent">Hidden</span>}
        </div>
        <h3 className="admin-card-title break-words">{detail.title}</h3>
        <p className="whitespace-pre-wrap break-words">{detail.message}</p>
        {detail.status === 'failed' && <div className="admin-info-box flex flex-wrap items-center justify-between gap-3 text-rose-700" role="alert">
          <span><strong>Last error:</strong> {detail.lastError || 'No error message from the server.'}</span>
          <button type="button" className="btn btn-sm btn-primary" disabled={working} onClick={() => retry(detail)}>Retry</button>
        </div>}
        {detail.status === 'processing' && <p role="status" className="text-muted">Sending now. This page updates every 5 seconds.</p>}
        <h3 className="admin-card-title">Schedule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Info label="Send time">{formatInZone(detail.scheduledFor, detail.timezone)}</Info>
          <Info label="Time zone">{detail.timezone || 'Not set'}</Info>
          <Info label="Sent at">{formatDateTime(detail.sentAt)}</Info>
          <Info label="Created by">{detail.createdBy?.fullName || '-'} · {formatDateTime(detail.createdAt)}</Info>
          <Info label="Attempts">{detail.attempts ?? 0} of 3</Info>
          <Info label="Last attempt started">{formatDateTime(detail.startedAt)}</Info>
          {detail.cancelledAt && <Info label="Cancelled at">{formatDateTime(detail.cancelledAt)}</Info>}
          {detail.hiddenAt && <Info label="Hidden at">{formatDateTime(detail.hiddenAt)}</Info>}
          {detail.lastError && detail.status !== 'failed' && <Info label="Last error">{detail.lastError}</Info>}
        </div>
        <h3 className="admin-card-title">Delivery</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Info label="Recipients">{(detail.recipients ?? 0).toLocaleString()}</Info>
          <Info label="Inbox notifications">{(detail.notificationsCreated ?? 0).toLocaleString()}</Info>
          <Info label="Read">{(detail.readCount ?? 0).toLocaleString()} ({readRate(detail.readCount, detail.notificationsCreated)})</Info>
          <Info label="Push accepted">{(detail.pushSuccessCount ?? 0).toLocaleString()}</Info>
          <Info label="Push refused">{(detail.pushFailureCount ?? 0).toLocaleString()}</Info>
        </div>
        <p className="text-[12px] text-muted">Push counts can be lower than recipients. Accounts with push switched off or no device get the inbox notification only.</p>
      </>}
    </AdminModal>}

    {compose && <ComposeModal key={compose.original?._id || 'new'} original={compose.original} onClose={() => setCompose(null)} onSaved={onSaved} onRequestError={recover} />}

    {confirm?.kind === 'cancel' && <AdminModal size="max-w-md" title="Cancel this notification?" onClose={() => { if (!busy.current) setConfirm(null) }} footer={<>
      <button type="button" className="btn btn-outline" disabled={working} onClick={() => setConfirm(null)}>Keep it</button>
      <button type="button" className="btn btn-danger" disabled={working} onClick={() => cancel(confirm.row)}>{working ? 'Cancelling...' : 'Cancel notification'}</button>
    </>}>
      <p>&ldquo;{confirm.row.title}&rdquo; will not be sent. You cannot undo this.</p>
    </AdminModal>}

    {confirm?.kind === 'hide' && <AdminModal size="max-w-md" title="Hide notifications" onClose={() => { if (!busy.current) setConfirm(null) }} footer={<>
      <button type="button" className="btn btn-outline" disabled={working} onClick={() => setConfirm(null)}>Cancel</button>
      <button type="button" className="btn btn-primary" disabled={working} onClick={() => setVisibility(confirm.ids, true)}>{working ? 'Hiding...' : 'Hide'}</button>
    </>}>
      <p>Hide {confirm.ids.length} notification{confirm.ids.length === 1 ? '' : 's'} from the list? The recipients keep them in their app. You can show them again in the Hidden view.</p>
    </AdminModal>}
  </div>
}
