import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { AdminHeader, AdminModal, AdminTable, AdminToolbar, FileImage, NameCell, RefreshButton, StatusPill } from './AdminParts'
import { apiRequest, apiRequestAll } from '../api/client'

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
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [icon, setIcon] = useState(null)
  const busy = useRef(false)

  const loadCategories = async () => {
    try {
      // The public /categories list only returns active categories; the admin list returns all.
      setCategories(await apiRequestAll('/admin/categories', 'categories'))
      setError(null)
    } catch (err) {
      setError(err.message)
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
    setSortOrder(0)
    setActionError('')
    setIcon(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (c) => {
    setEditingCat(c)
    setName(c.name)
    setDescription(c.description || '')
    setIsActive(c.isActive !== false)
    setSortOrder(c.sortOrder ?? 0)
    setActionError('')
    setIcon(null)
    setModalOpen(true)
  }

  const handleDelete = async (catId, catName) => {
    if (!window.confirm(`Delete trade category "${catName}"?`)) return
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setActionError('')
    try {
      await apiRequest(`/categories/${catId}`, { method: 'DELETE' })
      loadCategories()
    } catch (err) {
      setActionError(err.message || 'Delete failed')
    } finally { busy.current = false; setLoading(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    if (busy.current) return
    if (icon && icon.size > 25 * 1024 * 1024) { setActionError('The icon must be 25 MB or smaller.'); return }
    busy.current = true
    setLoading(true)
    setActionError('')
    try {
      const body = new FormData()
      body.set('name', name.trim())
      body.set('description', description.trim())
      body.set('isActive', String(isActive))
      body.set('sortOrder', String(sortOrder))
      if (icon) body.set('icon', icon)
      await apiRequest(editingCat ? `/categories/${editingCat._id}` : '/categories', { method: editingCat ? 'PATCH' : 'POST', body })
      setModalOpen(false)
      loadCategories()
    } catch (err) {
      setActionError(err.message || 'Save failed')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return categories.filter((c) => {
      let matchesFilter = true
      if (filter === 'Active') matchesFilter = c.isActive !== false
      else if (filter === 'Inactive') matchesFilter = c.isActive === false

      const matchesQuery = !q || [c.name, c.slug, c.description].some((f) => (f || '').toLowerCase().includes(q))
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
    { key: 'icon', label: 'Icon', render: (c) => c.icon && <FileImage key={c.icon._id} file={c.icon} className="size-10" /> },
    { key: 'sortOrder', label: 'Sort order' },
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
          <button type="button" className="btn btn-sm btn-outline" disabled={loading} onClick={() => handleOpenEdit(c)}>
            <Pencil strokeWidth={2} /> Edit
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger btn-icon"
            disabled={loading} onClick={() => handleDelete(c._id, c.name)}
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
            <button type="button" className="btn btn-primary" disabled={loading} onClick={handleOpenAdd}>
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

      {error && <p role="alert" className="text-rose-600">Couldn’t load categories: {error}</p>}
      {actionError && !modalOpen && <p role="alert" className="text-rose-600">{actionError}</p>}
      <AdminTable
        columns={columns}
        rows={rows}
        empty={error ? `Couldn't load categories: ${error}` : 'No trade categories match your filter.'}
      />

      {modalOpen && (
        <AdminModal
          as="form"
          onSubmit={handleSave}
          size="max-w-md"
          title={editingCat ? 'Edit trade category' : 'New trade category'}
          subtitle={editingCat ? `/${editingCat.slug || editingCat.name.toLowerCase().replace(/\s+/g, '-')}` : 'Shown to clients when posting a job.'}
          onClose={() => { if (!busy.current) setModalOpen(false) }}
          footer={
            <>
              <button type="button" className="btn btn-outline" disabled={loading} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : editingCat ? 'Save changes' : 'Create category'}
              </button>
            </>
          }
        >
          <div className="modal-fields">
            {actionError && <p role="alert" className="text-rose-600">{actionError}</p>}
            <label className="modal-field"><span className="modal-field-label">Sort order</span><input className="modal-field-input" type="number" min="0" step="1" required value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></label>
            <label className="modal-field"><span className="modal-field-label">Category icon (optional, up to 25 MB)</span>{editingCat?.icon && <FileImage file={editingCat.icon} className="size-16" />}<input key={editingCat?._id || 'new'} type="file" accept="image/*" onChange={(e) => setIcon(e.target.files?.[0] || null)} /></label>
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
