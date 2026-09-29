import { useState, useEffect } from 'react'
import { ChevronRight, DollarSign, ShieldCheck, Users, Zap } from 'lucide-react'
import { AdminHeader, AdminTable, NameCell, RefreshButton, StatCard, StatusPill } from './AdminParts'
import { adminLinkClick, adminPaths } from '../navigation'
import { apiCount, apiRequest, apiRequestAll } from '../api/client'
import { ACTIVE_JOB_STATUSES, PAID_JOB_STATUSES } from '../constants'

const formatCurrency = (val) =>
  Number(val || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const formatNumber = (val) => Number(val || 0).toLocaleString('en-US')

const round2 = (v) => Math.round(v * 100) / 100

const JOB_COLUMNS = [
  {
    key: 'title',
    label: 'Job / Trade',
    render: (j) => (
      <NameCell
        name={j.jobCode || j.title || 'Job'}
        sub={j.category?.name || j.title || 'General Service'}
        avatarChar={j.category?.name?.[0] || 'J'}
      />
    ),
  },
  {
    key: 'client',
    label: 'Client',
    render: (j) => <span className="admin-cell-strong">{j.client?.fullName || '—'}</span>,
  },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    render: (j) => (
      <span className="font-semibold text-primary">
        {Number(j.finalAmount ?? j.budget ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (j) => <StatusPill status={j.status} />,
  },
]

// Queue profiles carry `user` as an id; `account` is joined in from the worker list in load().
const WORKER_COLUMNS = [
  {
    key: 'name',
    label: 'Worker',
    render: (w) => (
      <NameCell
        name={w.account?.fullName || `Worker ···${String(w.user || '').slice(-6)}`}
        sub={w.account?.email}
        avatarChar={w.account?.fullName?.[0] || 'W'}
      />
    ),
  },
  {
    key: 'service',
    label: 'Trade',
    render: (w) => <span>{w.services?.[0]?.categoryName || '—'}</span>,
  },
  {
    key: 'experience',
    label: 'Experience',
    align: 'right',
    render: (w) => <span>{w.yearsExperience ? `${w.yearsExperience} yrs` : '—'}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (w) => <StatusPill status={w.verificationStatus} />,
  },
]

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [recentJobs, setRecentJobs] = useState([])
  const [pendingWorkers, setPendingWorkers] = useState([])
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const [jobs, queueRes, workers, clientCount, settingsRes] = await Promise.all([
        apiRequestAll('/admin/jobs', 'jobs'),
        apiRequest('/admin/workers/verification-queue?limit=5'),
        apiRequestAll('/admin/users', 'users', { role: 'worker' }),
        apiCount('/admin/users', { role: 'client' }),
        apiRequest('/settings/fees'),
      ])

      // Mirrors payment.service computeFees: the platform keeps the commission on the job amount
      // plus the priority fee. Uses today's commission rate, so it's an estimate for older jobs.
      const feePercent = settingsRes?.data?.platformFeePercent ?? 0
      const revenue = jobs
        .filter((j) => PAID_JOB_STATUSES.includes(j.status))
        .reduce((sum, j) => sum + round2(((j.finalAmount ?? j.budget ?? 0) * feePercent) / 100) + (j.priorityFee || 0), 0)

      const usersById = new Map(workers.map((u) => [u._id, u]))
      const queue = queueRes?.data?.profiles || []

      setStats({
        activeJobs: jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)).length,
        workers: workers.length,
        clients: clientCount,
        pendingVerifications: queueRes?.data?.pagination?.total ?? queue.length,
        platformRevenue: revenue,
      })
      setRecentJobs(jobs.slice(0, 5))
      setPendingWorkers(queue.map((p) => ({ ...p, account: usersById.get(p.user) || null })))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }
  useEffect(() => {
    load()
  }, [])

  return (
    <div className="admin-page">
      <AdminHeader
        title="Dashboard"
        subtitle="An overview of how the JobHopper marketplace is performing."
        actions={
          <>
            <RefreshButton onRefresh={load} />
            <a
              href={adminPaths.verifications}
              className="btn btn-primary"
              onClick={adminLinkClick(adminPaths.verifications)}
            >
              <ShieldCheck strokeWidth={2} /> Review verifications
            </a>
          </>
        }
      />

      <div className="admin-stats">
        <StatCard
          icon={Zap}
          label="Active Jobs"
          value={stats ? formatNumber(stats.activeJobs) : '—'}
          highlight={true}
        />
        <StatCard
          icon={ShieldCheck}
          label="Registered Workers"
          value={stats ? formatNumber(stats.workers) : '—'}
        />
        <StatCard
          icon={Users}
          label="Registered Clients"
          value={stats ? formatNumber(stats.clients) : '—'}
        />
        <StatCard
          icon={DollarSign}
          label="Est. Platform Revenue"
          value={stats ? formatCurrency(stats.platformRevenue) : '—'}
        />
      </div>

      <div className="admin-grid">
        <AdminTable
          title="Recent Marketplace Jobs"
          columns={JOB_COLUMNS}
          rows={recentJobs}
          empty={error ? `Couldn't load dashboard data: ${error}` : 'No jobs posted yet.'}
          action={
            <a
              href={adminPaths.jobs}
              className="admin-link"
              onClick={adminLinkClick(adminPaths.jobs)}
            >
              View all <ChevronRight strokeWidth={2} />
            </a>
          }
        />

        <AdminTable
          title={stats ? `Verification Queue (${formatNumber(stats.pendingVerifications)})` : 'Verification Queue'}
          columns={WORKER_COLUMNS}
          rows={pendingWorkers}
          empty={error ? '—' : 'No pending worker verifications.'}
          action={
            <a
              href={adminPaths.verifications}
              className="admin-link"
              onClick={adminLinkClick(adminPaths.verifications)}
            >
              Review queue <ChevronRight strokeWidth={2} />
            </a>
          }
        />
      </div>
    </div>
  )
}

export default Dashboard
