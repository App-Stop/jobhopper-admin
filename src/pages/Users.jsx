import { useRef, useState } from 'react'
import { Eye, UserCheck, UserX } from 'lucide-react'
import { AdminHeader, AdminTable, AdminToolbar, NameCell, Pager, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'
import UserDetails from './UserDetails'
import useAdminList from '../hooks/useAdminList'
import ListFilters from './ListFilters'

const FILTERS = ['All', 'Workers', 'Clients']

// `profiles` lists what the account can act as; a dual-profile account has both.
const isWorker = (u) => (u.profiles || []).includes('worker')
const isClient = (u) => (u.profiles || []).includes('client')

const roleLabel = (u) => {
  if (isWorker(u) && isClient(u)) return 'Worker & Client'
  if (isWorker(u)) return 'Tradesperson (Worker)'
  return 'Homeowner (Client)'
}

const Users = () => {
  const [filter, setFilter] = useState('All')
  const [filters, setFilters] = useState({})
  const { rows: users, counts, pagination, query, setQuery, page, setPage, error, loading, refresh: loadUsers } = useAdminList('/admin/users', 'users', { ...filters, role: filter === 'Workers' ? 'worker' : filter === 'Clients' ? 'client' : '' })
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [actionError, setActionError] = useState('')
  const actionBusy = useRef(false)

  const handleToggleDeactivate = async (user) => {
    if (actionBusy.current) return
    const nextState = !user.isDeactivated
    if (!window.confirm(`Are you sure you want to ${nextState ? 'deactivate' : 'reactivate'} ${user.fullName || user.email}?${nextState ? ' They will be signed out of every device.' : ''}`)) {
      return
    }

    actionBusy.current = true
    setActionError('')
    setActionLoading(user._id)
    try {
      await apiRequest(`/admin/users/${user._id}/deactivate`, {
        method: 'PATCH',
        body: JSON.stringify({ isDeactivated: nextState }),
      })
      loadUsers()
    } catch (err) {
      setActionError(err.message || 'Action failed')
    } finally {
      actionBusy.current = false
      setActionLoading(null)
    }
  }

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
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setSelectedUserId(u._id)}><Eye strokeWidth={2} /> View</button>
          <button
            type="button"
            disabled={!!actionLoading}
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

  const workerCount = counts.workers ?? 0
  const clientCount = counts.clients ?? 0

  return (
    <div className="admin-page">
      <AdminHeader
        title="Users"
        count={pagination?.total ?? users.length}
        subtitle={`${workerCount} tradespeople and ${clientCount} clients matching the current search and filters (dual-profile accounts count as both).`}
        actions={<RefreshButton onRefresh={loadUsers} />}
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search by name, email or phone"
        filters={FILTERS}
        filter={filter}
        onFilter={(value) => { setFilter(value); setPage(1) }}
        renderFilter={(value) => `${value} (${counts[value === 'All' ? 'all' : value === 'Workers' ? 'workers' : 'clients'] ?? 0})`}
        filterLabel="Filter by role or status"
      />

      <ListFilters onApply={(values) => { setFilters(values); setPage(1) }} fields={[
        { key: 'isDeactivated', label: 'Account status', options: [{ value: 'false', label: 'Active' }, { value: 'true', label: 'Deactivated' }] },
        { key: 'joinedFrom', label: 'Joined from', type: 'date' }, { key: 'joinedTo', label: 'Joined to', type: 'date' },
      ]} />
      {loading && <p role="status">Loading users…</p>}
      {error && <p role="alert" className="text-rose-600">Couldn’t load users: {error}</p>}
      {actionError && <p role="alert" className="text-rose-600">Couldn’t update user: {actionError}</p>}
      <AdminTable
        columns={columns}
        rows={users}
        empty={error ? `Couldn't load users: ${error}` : 'No user accounts match your search.'}
      />
      <Pager page={page} totalPages={pagination?.totalPages ?? 1} onPage={setPage} />
      {selectedUserId && <UserDetails key={selectedUserId} userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  )
}

export default Users
