import { useState, useEffect, useMemo } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import { AdminHeader, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest, apiRequestAll } from '../api/client'

const FILTERS = ['All', 'Workers', 'Clients', 'Active', 'Deactivated']

const Users = () => {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)

  // The user list doesn't include `isDeactivatedByAdmin`, but the endpoint can filter on it,
  // so a second query for deactivated accounts supplies the flag.
  const loadUsers = async () => {
    try {
      const [all, deactivated] = await Promise.all([
        apiRequestAll('/admin/users', 'users'),
        apiRequestAll('/admin/users', 'users', { isDeactivated: 'true' }),
      ])
      const deactivatedIds = new Set(deactivated.map((u) => u._id))
      setUsers(all.map((u) => ({ ...u, isDeactivatedByAdmin: deactivatedIds.has(u._id) })))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleDeactivate = async (user) => {
    const nextState = !user.isDeactivatedByAdmin
    if (!window.confirm(`Are you sure you want to ${nextState ? 'deactivate' : 'reactivate'} ${user.fullName || user.email}?${nextState ? ' They will be signed out of every device.' : ''}`)) {
      return
    }

    setActionLoading(user._id)
    try {
      await apiRequest(`/admin/users/${user._id}/deactivate`, {
        method: 'PATCH',
        body: JSON.stringify({ isDeactivated: nextState }),
      })
      loadUsers()
    } catch (err) {
      alert(err.message || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      let matchesFilter = true
      if (filter === 'Workers') matchesFilter = u.isWorker
      else if (filter === 'Clients') matchesFilter = !u.isWorker
      else if (filter === 'Active') matchesFilter = !u.isDeactivatedByAdmin
      else if (filter === 'Deactivated') matchesFilter = u.isDeactivatedByAdmin

      const name = u.fullName || ''
      const email = u.email || ''
      const phone = u.phone || ''
      const matchesQuery = !q || [name, email, phone].some((f) => f.toLowerCase().includes(q))

      return matchesFilter && matchesQuery
    })
  }, [users, query, filter])

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (u) => (
        <NameCell
          name={u.fullName || 'User'}
          sub={u.email}
          avatarChar={u.fullName?.[0]}
        />
      ),
    },
    {
      key: 'role',
      label: 'Marketplace Role',
      render: (u) => (
        <span className="font-semibold text-[13px] text-dark-900">
          {u.isWorker ? 'Tradesperson (Worker)' : 'Homeowner (Client)'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone Contact',
      render: (u) => <span>{u.phone || '—'}</span>,
    },
    {
      key: 'joined',
      label: 'Joined',
      render: (u) => (
        <span>
          {u.createdAt
            ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => (
        <StatusPill status={u.isDeactivatedByAdmin ? 'Deactivated' : 'Active'} />
      ),
    },
    {
      key: 'action',
      label: 'Moderation',
      align: 'right',
      render: (u) => (
        <div className="admin-row-actions">
          <button
            type="button"
            disabled={actionLoading === u._id}
            className={`btn btn-sm ${u.isDeactivatedByAdmin ? 'btn-success' : 'btn-danger'}`}
            onClick={() => handleToggleDeactivate(u)}
          >
            {u.isDeactivatedByAdmin ? <UserCheck strokeWidth={2} /> : <UserX strokeWidth={2} />}
            {u.isDeactivatedByAdmin ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      ),
    },
  ]

  const workerCount = users.filter((u) => u.isWorker).length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Users"
        count={users.length}
        subtitle={`${workerCount} tradespeople and ${users.length - workerCount} clients registered on the marketplace.`}
        actions={<RefreshButton onRefresh={loadUsers} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search by name, email or phone"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by role or status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={error ? `Couldn't load users: ${error}` : 'No user accounts match your search.'}
      />
    </div>
  )
}

export default Users
