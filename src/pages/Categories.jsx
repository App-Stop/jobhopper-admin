import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest } from '../api/client'

const FILTERS = ['All', 'Active', 'Inactive']

const Categories = () => {
  const [categories, setCategories] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadCategories = async () => {
    try {
      const res = await apiRequest('/categories')
      setCategories(res?.data?.categories || [])
    } catch (err) {
      console.warn('Failed to load categories:', err)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleOpenAdd = () => {
    setEditingCat(null)
    setName('')
    setDescription('')
    setIsActive(true)
    setModalOpen(true)
  }

  const handleOpenEdit = (c) => {
    setEditingCat(c)
    setName(c.name)
    setDescription(c.description || '')
    setIsActive(c.isActive !== false)
    setModalOpen(true)
  }

  const handleDelete = async (catId, catName) => {
    if (!window.confirm(`Delete trade category "${catName}"?`)) return
    try {
      await apiRequest(`/categories/${catId}`, { method: 'DELETE' })
      loadCategories()
    } catch (err) {
      alert(err.message || 'Delete failed')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editingCat) {
        await apiRequest(`/categories/${editingCat._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), description: description.trim(), isActive }),
        })
      } else {
        await apiRequest('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), description: description.trim(), isActive }),
        })
      }
      setModalOpen(false)
      loadCategories()
    } catch (err) {
      alert(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return categories.filter((c) => {
      let matchesFilter = true
      if (filter === 'Active') matchesFilter = c.isActive !== false
      else if (filter === 'Inactive') matchesFilter = c.isActive === false

      const matchesQuery = !q || [c.name, c.slug, c.description || ''].some((f) => f.toLowerCase().includes(q))
      return matchesFilter && matchesQuery
    })
  }, [categories, query, filter])

  const columns = [
    {
      key: 'name',
      label: 'Trade Category',
      render: (c) => (
        <NameCell
          name={c.name}
          sub={`/${c.slug || c.name.toLowerCase().replace(/\s+/g, '-')}`}
          avatarChar={c.name[0]}
        />
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (c) => (
        <span className="text-[13px] text-muted line-clamp-1 max-w-[400px]">
          {c.description || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => <StatusPill status={c.isActive !== false ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'action',
      label: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="admin-row-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => handleOpenEdit(c)}>
            <Pencil strokeWidth={2} /> Edit
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger btn-icon"
            onClick={() => handleDelete(c._id, c.name)}
            aria-label={`Delete ${c.name}`}
            title="Delete"
          >
            <Trash2 strokeWidth={2} />
          </button>
        </div>
      ),
    },
  ]

  const activeCount = categories.filter((c) => c.isActive !== false).length

  return (
    <div className="admin-page">
      <AdminHeader
        title="Categories"
        count={categories.length}
        subtitle={`${activeCount} trade categories live in marketplace search, matching and bidding.`}
        actions={
          <>
            <RefreshButton onRefresh={loadCategories} />
            <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus strokeWidth={2} /> Add category
            </button>
          </>
        }
      />

      <AdminToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search trade name or description"
        filters={FILTERS}
        filter={filter}
        onFilter={setFilter}
        filterLabel="Filter by category status"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        empty="No trade categories match your filter."
      />

      {modalOpen && (
        <AdminModal
          as="form"
          onSubmit={handleSave}
          size="max-w-md"
          title={editingCat ? 'Edit trade category' : 'New trade category'}
          subtitle={editingCat ? `/${editingCat.slug || editingCat.name.toLowerCase().replace(/\s+/g, '-')}` : 'Shown to clients when posting a job.'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : editingCat ? 'Save changes' : 'Create category'}
              </button>
            </>
          }
        >
          <div className="modal-fields">
            <label className="modal-field">
              <span className="modal-field-label">Category name</span>
              <input
                className="modal-field-input"
                type="text"
                placeholder="e.g. Appliance Repair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </label>

            <label className="modal-field">
              <span className="modal-field-label">Description</span>
              <textarea
                className="modal-field-textarea"
                rows={3}
                placeholder="Services covered under this category…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-[18px] border border-line cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
              <span className="flex flex-col">
                <span className="text-[14px] font-semibold text-dark-900">Active</span>
                <span className="text-[12px] text-muted">Visible in marketplace search and job posting</span>
              </span>
            </label>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

export default Categories
