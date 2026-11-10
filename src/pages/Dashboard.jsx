import { useState, useEffect } from 'react'
import { ChevronRight, DollarSign, Inbox, ShieldCheck, Users, Zap } from 'lucide-react'
import { AdminHeader, AdminTable, NameCell, RefreshButton, StatCard, StatusPill } from './AdminParts'
import { adminLinkClick, adminPaths } from '../navigation'
import { apiRequest } from '../api/client'
import { categoryNames, formatMoney } from '../constants'

const formatCurrency = (val) =>
  Number(val || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const formatNumber = (val) => Number(val || 0).toLocaleString('en-US')

const JOB_COLUMNS = [
  {
    key: 'title',
    label: 'Job / Trade',
    render: (j) => (
      <NameCell
        name={j.jobCode || j.title || 'Job'}
        sub={j.title || categoryNames(j).join(', ') || 'General Service'}
        avatarChar={categoryNames(j)[0]?.[0] || 'J'}
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

// Queue profiles carry `user` as a bare id; `account` is fetched per worker in load().
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
    render: (w) => <span>{w.services?.[0]?.category?.name || '—'}</span>,
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

const JOB_GROUPS = [
  ['open', 'Open'],
  ['active', 'Active (booked → awaiting confirmation)'],
  ['completed', 'Completed (paid / reviewed)'],
  ['disputed', 'Disputed'],
  ['cancelled', 'Cancelled'],
  ['expired', 'Expired'],
  ['declined', 'Declined'],
]

const ESCROW_STAGES = [
  ['inProgress', 'Jobs in progress'],
  ['awaitingConfirmation', 'Awaiting client confirmation'],
  ['disputed', 'Disputed'],
]

const Row = ({ label, value, sub, href }) => (
  <div className="flex items-baseline justify-between gap-3 py-2 border-b border-line last:border-0 text-[13.5px]">
    {href ? (
      <a href={href} className="admin-link" onClick={adminLinkClick(href)}>
        {label} <ChevronRight strokeWidth={2} />
      </a>
    ) : (
      <span className="text-muted">{label}</span>
    )}
    <span className="text-right">
      <strong className="tabular-nums text-dark-900">{value}</strong>
      {sub && <span className="block text-[12px] text-muted">{sub}</span>}
    </span>
  </div>
)

const Panel = ({ title, hint, children }) => (
  <section className="admin-card">
    <div className="admin-card-head">
      <div className="min-w-0">
        <h2 className="admin-card-title">{title}</h2>
        {hint && <p className="admin-card-hint">{hint}</p>}
      </div>
    </div>
    <div className="px-5 pb-4">{children}</div>
  </section>
)

const Dashboard = () => {
  const [overview, setOverview] = useState(null)
  const [overviewError, setOverviewError] = useState(null)
  const [recentJobs, setRecentJobs] = useState([])
  const [pendingWorkers, setPendingWorkers] = useState([])
  const [pendingVerifications, setPendingVerifications] = useState(null)
  const [error, setError] = useState(null)

  const loadOverview = async () => {
    try {
      const res = await apiRequest('/admin/overview')
      setOverview(res?.data || null)
      setOverviewError(null)
    } catch (err) {
      setOverviewError(err.message)
    }
  }

  const loadTables = async () => {
    try {
      const [jobsRes, queueRes] = await Promise.all([
        apiRequest('/admin/jobs?limit=5'),
        apiRequest('/admin/workers/verification-queue?status=pending&limit=5'),
      ])
      const queue = queueRes?.data?.profiles || []

      // The queue doesn't include the worker's name/email, so look each one up.
      const accounts = await Promise.all(
        queue.map((p) =>
          apiRequest(`/admin/users/${p.user}`)
            .then((res) => res?.data?.user || null)
            .catch(() => null),
        ),
      )

      setRecentJobs(jobsRes?.data?.jobs || [])
      setPendingWorkers(queue.map((p, i) => ({ ...p, account: accounts[i] })))
      setPendingVerifications(queueRes?.data?.pagination?.total ?? queue.length)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const load = () => Promise.all([loadOverview(), loadTables()])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const o = overview
  const num = (v) => (o ? formatNumber(v) : '—')
  const cash = (v) => (o ? formatMoney(v) : '—')

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

      {overviewError && (
        <p className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700" role="alert">
          Couldn&apos;t load the overview: {overviewError}
        </p>
      )}

      <div className="admin-stats">
        <StatCard
          icon={Zap}
          label="Active Jobs"
          value={num(o?.jobs?.active)}
          note={o ? `${formatNumber(o.jobs?.total)} jobs in total` : undefined}
          highlight={true}
        />
        <StatCard
          icon={DollarSign}
          label="Platform Revenue"
          value={o ? formatCurrency(o.revenue?.allTime) : '—'}
          note={o ? `${formatCurrency(o.revenue?.thisMonth)} this month (UTC)` : undefined}
        />
        <StatCard
          icon={Users}
          label="Users"
          value={num(o?.users?.total)}
          note={o ? `${formatNumber(o.users?.clients)} clients · ${formatNumber(o.users?.workers)} workers` : undefined}
        />
        <StatCard
          icon={Inbox}
          label="Open Requests"
          value={num(o?.openRequests?.total)}
          note={o ? `${formatNumber(o.openRequests?.open)} open posts · ${formatNumber(o.openRequests?.directHire)} direct hire` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Jobs by stage" hint="Every job is in exactly one group.">
          {JOB_GROUPS.map(([key, label]) => (
            <Row key={key} label={label} value={num(o?.jobs?.[key])} />
          ))}
        </Panel>

        <Panel
          title="Money held"
          hint="Client payments in escrow for unfinished jobs, and earnings workers haven't withdrawn."
        >
          {ESCROW_STAGES.map(([key, label]) => {
            const stage = o?.escrow?.held?.[key]
            return (
              <Row
                key={key}
                label={label}
                value={cash(stage?.total)}
                sub={o ? `${formatNumber(stage?.count)} payments · ${formatMoney(stage?.serviceFee)} due to workers` : undefined}
              />
            )
          })}
          <Row
            label="Worker wallets"
            value={cash(o?.escrow?.workerWallets?.available)}
            sub={o ? `available · ${formatMoney(o.escrow?.workerWallets?.pending)} pending` : undefined}
          />
        </Panel>

        <Panel title="Needs attention">
          <Row label="Open disputes" value={num(o?.openDisputes)} href={adminPaths.disputes} />
          <Row label="Open requests" value={num(o?.openRequests?.total)} href={adminPaths.openRequests} />
          <Row
            label="Completed payouts"
            value={cash(o?.payouts?.completedAmount)}
            sub={o ? `${formatNumber(o.payouts?.completedCount)} withdrawals sent to banks` : undefined}
            href={adminPaths.payouts}
          />
        </Panel>
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
          title={pendingVerifications !== null ? `Verification Queue (${formatNumber(pendingVerifications)})` : 'Verification Queue'}
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
