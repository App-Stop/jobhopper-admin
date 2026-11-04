// Mirrors job-hopper-backend src/feature/job/job.constants.js JOB_STATUSES, grouped for the admin UI.
// `completed` means the worker marked the job done and it's waiting on the client's confirmation;
// `paid` / `reviewed` are the finished states (same split as GET /admin/overview).
export const JOB_STATUS_GROUPS = {
  Open: ['open'],
  Booked: ['accepted', 'awaiting_payment', 'awaiting_dispatch'],
  'In Progress': ['en_route', 'arrived', 'started'],
  'Awaiting Confirmation': ['completed'],
  Completed: ['paid', 'reviewed'],
  Disputed: ['disputed'],
  Closed: ['cancelled', 'expired', 'declined'],
}

// Backend ACTIVE_JOB_STATUSES.
export const ACTIVE_JOB_STATUSES = [
  ...JOB_STATUS_GROUPS.Booked,
  ...JOB_STATUS_GROUPS['In Progress'],
  ...JOB_STATUS_GROUPS['Awaiting Confirmation'],
]

// Jobs carry `categories: [{ _id, name }]`.
export const categoryNames = (job) => (job?.categories || []).map((c) => c?.name).filter(Boolean)

export const formatMoney = (v) =>
  v === null || v === undefined
    ? '—'
    : Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'
