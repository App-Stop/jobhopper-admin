// Mirrors job-hopper-backend src/feature/job/job.constants.js JOB_STATUSES, grouped for the admin UI.
export const JOB_STATUS_GROUPS = {
  Open: ['open'],
  Booked: ['accepted', 'awaiting_payment'],
  'In Progress': ['en_route', 'arrived', 'started'],
  Completed: ['completed', 'paid', 'reviewed'],
  Disputed: ['disputed'],
  Closed: ['cancelled', 'expired'],
}

export const ACTIVE_JOB_STATUSES = [...JOB_STATUS_GROUPS.Booked, ...JOB_STATUS_GROUPS['In Progress']]

// The client pays into escrow while the job is `awaiting_payment`; every later status (short of
// cancellation) means that payment went through.
export const PAID_JOB_STATUSES = ['en_route', 'arrived', 'started', 'completed', 'paid', 'reviewed']
