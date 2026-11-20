import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  audienceLabel, canHide, chunk, createBody, editBody, isoToZonedInput, isValidTimeZone,
  readRate, scheduleError, statusLabel, sumCounts, zonedToIso,
} from '../src/utils/notifications.js'

test('picked wall time becomes an ISO string with the zone offset', () => {
  assert.equal(zonedToIso('2027-01-15T09:00', 'Asia/Karachi'), '2027-01-15T09:00:00+05:00')
  assert.equal(zonedToIso('2027-01-15T09:00', 'UTC'), '2027-01-15T09:00:00+00:00')
  assert.equal(zonedToIso('2027-01-15T09:00', 'America/New_York'), '2027-01-15T09:00:00-05:00')
  assert.equal(zonedToIso('2027-07-15T09:00', 'America/New_York'), '2027-07-15T09:00:00-04:00') // DST
  assert.equal(zonedToIso('2027-01-15T09:00', 'Asia/Kolkata'), '2027-01-15T09:00:00+05:30')
  assert.equal(Date.parse(zonedToIso('2027-01-15T09:00', 'Asia/Karachi')), Date.parse('2027-01-15T04:00:00.000Z'))
  assert.equal(zonedToIso('', 'UTC'), null)
  assert.equal(zonedToIso('2027-01-15T09:00', 'Not/AZone'), null)
})

test('stored UTC time is shown back as wall time in its zone', () => {
  assert.equal(isoToZonedInput('2027-01-15T04:00:00.000Z', 'Asia/Karachi'), '2027-01-15T09:00')
  assert.equal(isoToZonedInput('2027-01-15T00:30:00.000Z', 'America/New_York'), '2027-01-14T19:30')
  assert.equal(isoToZonedInput(null, 'UTC'), '')
  assert.ok(isValidTimeZone('Asia/Karachi'))
  assert.ok(!isValidTimeZone(''))
})

test('schedule window is 1 minute to 1 year from now', () => {
  const now = Date.parse('2026-11-20T10:00:00Z')
  assert.match(scheduleError('2026-11-20T10:00:30Z', now), /at least 1 minute/)
  assert.equal(scheduleError('2026-11-20T10:01:00Z', now), '')
  assert.equal(scheduleError('2027-11-20T10:00:00Z', now), '')
  assert.match(scheduleError('2027-11-20T10:00:01Z', now), /within 1 year/)
  assert.match(scheduleError('nope', now), /valid date/)
})

test('create body trims text and only schedules in Schedule mode', () => {
  const base = { audience: 'workers', title: '  Hi ', message: ' Body  ', local: '2027-01-15T09:00', timeZone: 'Asia/Karachi' }
  assert.deepEqual(createBody({ ...base, mode: 'now' }), { audience: 'workers', title: 'Hi', message: 'Body' })
  assert.deepEqual(createBody({ ...base, mode: 'schedule' }), {
    audience: 'workers', title: 'Hi', message: 'Body', scheduledFor: '2027-01-15T09:00:00+05:00', timezone: 'Asia/Karachi',
  })
})

test('edit body sends only changed fields and keeps timezone with scheduledFor', () => {
  const original = { audience: 'all', title: 'T', message: 'M', scheduledFor: '2027-01-15T04:00:00.000Z', timezone: 'Asia/Karachi' }
  const form = { audience: 'all', title: 'T', message: 'M', local: '2027-01-15T09:00', timeZone: 'Asia/Karachi', initialTimeZone: 'Asia/Karachi' }
  assert.deepEqual(editBody(original, form), {})
  assert.deepEqual(editBody(original, { ...form, title: ' New ' }), { title: 'New' })
  assert.deepEqual(editBody(original, { ...form, local: '2027-01-15T10:00' }), { scheduledFor: '2027-01-15T10:00:00+05:00', timezone: 'Asia/Karachi' })
  // No stored zone: the browser zone used to pre-fill the form is not a change.
  const noZone = { ...original, timezone: null }
  assert.deepEqual(editBody(noZone, { ...form, initialTimeZone: 'Asia/Karachi' }), {})
})

test('read rate never divides by zero', () => {
  assert.equal(readRate(0, 0), '-')
  assert.equal(readRate(5, null), '-')
  assert.equal(readRate(50, 200), '25%')
  assert.equal(readRate(1, 300), '0.3%')
  assert.equal(readRate(0, 10), '0%')
})

test('hide rules, ids batching, labels and counts', () => {
  assert.ok(canHide({ status: 'sent' }))
  assert.ok(canHide({ status: 'cancelled' }))
  for (const status of ['scheduled', 'processing', 'failed']) assert.ok(!canHide({ status }))
  assert.ok(!canHide({ status: 'sent', isHidden: true }))
  const ids = Array.from({ length: 250 }, (_, i) => String(i))
  assert.deepEqual(chunk(ids).map((group) => group.length), [100, 100, 50])
  assert.equal(statusLabel('processing'), 'Sending')
  assert.equal(audienceLabel('all'), 'Everyone')
  assert.equal(sumCounts({ scheduled: 2, processing: 0, sent: 41, failed: 1, cancelled: 3 }), 47)
})
