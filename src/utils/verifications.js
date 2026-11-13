import { formatDateTime } from '../constants.js'

export const methodName = (method) => method === 'veriff' ? 'Veriff' : method === 'manual' ? 'Manual' : '-'
export const decision = (record) => {
  if (record.status === 'pending') return record.method === 'veriff' ? 'Waiting for Veriff' : record.method === 'manual' ? 'Waiting for an admin' : 'Waiting for a decision'
  if (!['approved', 'rejected'].includes(record.status)) return '-'
  if (record.reviewedBy) return `${record.reviewedBy.fullName || 'Admin'}${record.reviewedAt ? ` · ${formatDateTime(record.reviewedAt)}` : ''}`
  return record.reviewedAt ? `Veriff · ${formatDateTime(record.reviewedAt)}` : '-'
}
