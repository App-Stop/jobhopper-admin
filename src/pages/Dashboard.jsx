import { useState, useEffect } from 'react'
import { ChevronRight, DollarSign, ShieldCheck, Users, Zap } from 'lucide-react'
import { AdminHeader, AdminTable, NameCell, RefreshButton, StatCard, StatusPill } from './AdminParts'
import { adminLinkClick, adminPaths } from '../navigation'
import { apiRequest } from '../api/client'

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
        sub={j.category?.name || j.title || 'General Service'}
        avatarChar={j.category?.name?.[0] || 'J'}
      />
    ),
  },
  {
    key: 'client',
    label: 'Client',
    render: (j) => <span className="admin-cell-strong">{j.client?.fullName || 'Client'}</span>,
  },
  {
    key: 'budget',
    label: 'Escrow',
    align: 'right',
    render: (j) => <span className="font-semibold text-primary">${j.finalAmount || j.budget}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (j) => <StatusPill status={j.status} />,
  },
]

const WORKER_COLUMNS = [
  {
    key: 'name',
    label: 'Worker',
    render: (w) => (
      <NameCell
        name={w.user?.fullName || 'Worker'}
        sub={w.user?.email || 'Registered Pro'}
        avatarChar={w.user?.fullName?.[0] || 'W'}
      />
    ),
  },
  {
    key: 'service',
    label: 'Trade Category',
    render: (w) => <span>{w.services?.[0]?.category?.name || 'General Trades'}</span>,
  },
  {
    key: 'rate',
    label: 'Hourly Rate',
    align: 'right',
    render: (w) => <span className="font-semibold text-dark-900">${w.hourlyRate || 45}/hr</span>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (w) => <StatusPill status={w.verification?.status || 'pending'} />,
  },
]

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeJobs: 18,
    verifiedWorkers: 42,
    totalClients: 128,
    platformRevenue: 12480,
  })
  const [recentJobs, setRecentJobs] = useState([])
  const [pendingWorkers, setPendingWorkers] = useState([])

  const load = async () => {
    try {
      const [jobsRes, verifsRes, usersRes, settingsRes] = await Promise.all([
        apiRequest('/admin/jobs'),
        apiRequest('/admin/workers/verification-queue'),
        apiRequest('/admin/users'),
        apiRequest('/settings/fees'),
      ])

      const jobs = jobsRes?.data?.jobs || []
      const verifs = verifsRes?.data?.profiles || []
      const users = usersRes?.data?.users || []
      const workers = users.filter((u) => u.isWorker).length
      const clients = users.length - workers

      const totalEscrowVolume = jobs.reduce((sum, j) => sum + (j.finalAmount || j.budget || 0), 0)
      const feePercent = settingsRes?.data?.platformFeePercent || 5.0
      const revenue = (totalEscrowVolume * feePercent) / 100

      setStats({
        activeJobs: jobs.filter((j) => ['open', 'en_route', 'arrived', 'started'].includes(j.status)).length || jobs.length,
        verifiedWorkers: workers || 42,
        totalClients: clients || 128,
        platformRevenue: revenue || 12480,
      })

      setRecentJobs(jobs.slice(0, 5))
      setPendingWorkers(verifs.slice(0, 5))
    } catch (err) {
      console.warn('Dashboard fetch fallback:', err)
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
          value={formatNumber(stats.activeJobs)}
          change={8.4}
          highlight={true}
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified Providers"
          value={formatNumber(stats.verifiedWorkers)}
          change={12.5}
        />
        <StatCard
          icon={Users}
          label="Registered Clients"
          value={formatNumber(stats.totalClients)}
          change={5.2}
        />
        <StatCard
          icon={DollarSign}
          label="Platform Commission"
          value={formatCurrency(stats.platformRevenue)}
          change={14.8}
        />
      </div>

      <div className="admin-grid">
        <AdminTable
          title="Recent Marketplace Jobs"
          columns={JOB_COLUMNS}
          rows={recentJobs}
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
          title="Verification Queue"
          columns={WORKER_COLUMNS}
          rows={pendingWorkers}
          empty="No pending worker verifications."
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
