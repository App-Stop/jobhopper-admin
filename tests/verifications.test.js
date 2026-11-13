import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decision, methodName } from '../src/utils/verifications.js'
import { formatDateTime } from '../src/constants.js'

test('pending decision attribution follows verification method', () => {
  assert.equal(decision({ status: 'pending', method: 'veriff' }), 'Waiting for Veriff')
  assert.equal(decision({ status: 'pending', method: 'manual' }), 'Waiting for an admin')
  assert.equal(decision({ status: 'pending' }), 'Waiting for a decision')
})

test('completed decisions identify admin or Veriff without inventing an attribution', () => {
  const reviewedAt = '2026-11-12T09:30:00.000Z'
  const admin = decision({ status: 'approved', reviewedBy: { fullName: 'Reviewer' }, reviewedAt })
  assert.ok(admin.startsWith('Reviewer'))
  assert.ok(admin.includes(formatDateTime(reviewedAt)))
  assert.ok(decision({ status: 'rejected', reviewedAt }).startsWith('Veriff'))
  assert.equal(decision({ status: 'approved' }), '-')
  assert.equal(decision({ status: 'not_submitted', reviewedAt }), '-')
  assert.equal(decision({ status: 'expired', reviewedAt }), '-')
})

test('missing verification method has a placeholder', () => {
  assert.equal(methodName(null), '-')
  assert.equal(methodName('veriff'), 'Veriff')
  assert.equal(methodName('manual'), 'Manual')
})
