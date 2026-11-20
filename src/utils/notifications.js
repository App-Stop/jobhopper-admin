// Helpers for the admin broadcast notifications screen (ADMIN_NOTIFICATIONS_FRONTEND_INTEGRATION_GUIDE.md).

export const TITLE_MAX = 120
export const MESSAGE_MAX = 500
export const HIDE_BATCH = 100 // server maximum ids per hide/unhide request
export const POLL_MS = 5000

export const AUDIENCES = [
  { value: 'workers', label: 'All workers' },
  { value: 'clients', label: 'All clients' },
  { value: 'all', label: 'Everyone' },
]
export const audienceLabel = (value) => AUDIENCES.find((a) => a.value === value)?.label || value || '-'

// StatusPill overrides: `processing` reads as "Sending"; `sent`/`failed` reuse the shared colours.
export const STATUS_LABELS = {
  scheduled: { label: 'Scheduled', modifier: 'pending' },
  processing: { label: 'Sending', modifier: 'pending' },
  sent: { label: 'Sent', modifier: 'active' },
  failed: { label: 'Failed', modifier: 'suspended' },
  cancelled: { label: 'Cancelled', modifier: 'inactive' },
}
export const statusLabel = (status) => STATUS_LABELS[status]?.label || status || 'Unknown'

// Only finished messages can be hidden from the list.
export const canHide = (row) => !row?.isHidden && (row?.status === 'sent' || row?.status === 'cancelled')

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const isValidTimeZone = (timeZone) => {
  if (!timeZone || typeof timeZone !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export const timeZoneOptions = () => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

const pad = (n) => String(n).padStart(2, '0')

const partsInZone = (date, timeZone) => {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  return Object.fromEntries(format.formatToParts(date).map((part) => [part.type, part.value]))
}

// Minutes the zone is ahead of UTC at `date`.
const zoneOffsetMinutes = (date, timeZone) => {
  const p = partsInZone(date, timeZone)
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return Math.round((wall - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/**
 * Turns a `<input type="datetime-local">` value ("2027-01-15T09:00") read as wall time in `timeZone`
 * into an ISO string with that zone's offset ("2027-01-15T09:00:00+05:00"). Returns null when invalid.
 */
export const zonedToIso = (local, timeZone) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(local || '')
  if (!m || !isValidTimeZone(timeZone)) return null
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  // Two passes settle the offset around DST changes.
  let offset = zoneOffsetMinutes(new Date(wall), timeZone)
  offset = zoneOffsetMinutes(new Date(wall - offset * 60000), timeZone)
  const abs = Math.abs(offset)
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00${offset < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

// The reverse of zonedToIso: an instant shown as a datetime-local value in `timeZone`.
export const isoToZonedInput = (iso, timeZone) => {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime()) || !isValidTimeZone(timeZone)) return ''
  const p = partsInZone(date, timeZone)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// Date and time in the zone the admin chose (falls back to the browser zone), with the zone's short name.
export const formatInZone = (iso, timeZone) => {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) return '-'
  const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }
  try {
    return date.toLocaleString('en-US', isValidTimeZone(timeZone) ? { ...options, timeZone } : options)
  } catch {
    return date.toLocaleString('en-US', options)
  }
}

// Same window the server enforces: 1 minute to 1 year from now.
export const scheduleError = (iso, now = Date.now()) => {
  const time = Date.parse(iso || '')
  if (Number.isNaN(time)) return 'Pick a valid date, time and time zone.'
  if (time < now + 60 * 1000) return 'The send time must be at least 1 minute from now.'
  const limit = new Date(now)
  limit.setFullYear(limit.getFullYear() + 1)
  if (time > limit.getTime()) return 'The send time must be within 1 year from now.'
  return ''
}

/** Form → POST /admin/notifications body. `form` = { audience, title, message, mode, local, timeZone }. */
export const createBody = (form) => {
  const body = { audience: form.audience, title: form.title.trim(), message: form.message.trim() }
  if (form.mode === 'schedule') {
    body.scheduledFor = zonedToIso(form.local, form.timeZone)
    body.timezone = form.timeZone
  }
  return body
}

/**
 * Form → PATCH body with only the fields that changed. `timezone` always travels with `scheduledFor`,
 * and an unchanged send time is not re-sent (it may already be less than 1 minute away).
 */
export const editBody = (original, form) => {
  const body = {}
  if (form.audience !== original.audience) body.audience = form.audience
  if (form.title.trim() !== original.title) body.title = form.title.trim()
  if (form.message.trim() !== original.message) body.message = form.message.trim()
  const scheduledFor = zonedToIso(form.local, form.timeZone)
  const timeChanged = Date.parse(scheduledFor) !== Date.parse(original.scheduledFor)
  // `initialTimeZone` is the zone the form was pre-filled with (the browser zone when none was stored).
  const zoneChanged = form.timeZone !== (form.initialTimeZone ?? original.timezone ?? '')
  if (timeChanged || zoneChanged) {
    body.scheduledFor = scheduledFor
    body.timezone = form.timeZone
  }
  return body
}

// `readCount / notificationsCreated` as a percentage label; never divides by zero.
export const readRate = (readCount, created) => {
  if (!created) return '-'
  const rate = ((readCount || 0) / created) * 100
  return `${rate >= 10 || rate === 0 ? Math.round(rate) : rate.toFixed(1)}%`
}

export const chunk = (items, size = HIDE_BATCH) => {
  const groups = []
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size))
  return groups
}

export const sumCounts = (counts = {}) => Object.keys(STATUS_LABELS).reduce((sum, key) => sum + (counts[key] || 0), 0)

// Fired after any change so the sidebar's Failed badge can update; `detail.failed` carries a fresh count.
export const NOTIFICATIONS_CHANGED_EVENT = 'notifications:changed'
