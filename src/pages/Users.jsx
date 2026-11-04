import { useState, useEffect, useMemo } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import { AdminHeader, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest, apiRequestAll } from '../api/client'

const FILTERS = ['All', 'Workers', 'Clients', 'Active', 'Deactivated']

// `profiles` lists what the account can act as; a dual-profile account has both.
const isWorker = (u) => (u.profiles || []).includes('worker')
const isClient = (u) => (u.profiles || []).includes('client')

const roleLabel = (u) => {
  if (isWorker(u) && isClient(u)) return 'Worker & Client'
  if (isWorker(u)) return 'Tradesperson (Worker)'
  return 'Homeowner (Client)'
}

const Users = () => {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)

  const loadUsers = async () => {
    try {
      setUsers(await apiRequestAll('/admin/users', 'users'))
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleDeactivate = async (user) => {
    const nextState = !user.isDeactivated
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
      if (filter === 'Workers') matchesFilter = isWorker(u)
      else if (filter === 'Clients') matchesFilter = isClient(u)
      else if (filter === 'Active') matchesFilter = !u.isDeactivated
      else if (filter === 'Deactivated') matchesFilter = u.isDeactivated

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
          {roleLabel(u)}
          {u.verificationStatus && (
            <span className="ml-2 align-middle">
              <StatusPill status={u.verificationStatus} />
            </span>
          )}
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
        <StatusPill status={u.isDeactivated ? 'Deactivated' : 'Active'} />
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
            className={`btn btn-sm ${u.isDeactivated ? 'btn-success' : 'btn-danger'}`}
            onClick={() => handleToggleDeactivate(u)}
          >
            {u.isDeactivated ? <UserCheck strokeWidth={2} /> : <UserX strokeWidth={2} />}
            {u.isDeactivated ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      ),
    },
  ]

  const workerCount = users.filter(isWorker).length
  const clientCount = users.filter(isClient).length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Users"
        count={users.length}
        subtitle={`${workerCount} tradespeople and ${clientCount} clients registered on the marketplace (dual-profile accounts count as both).`}
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
