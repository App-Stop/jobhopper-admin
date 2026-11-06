import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'

export default function useAdminList(endpoint, key, params = {}) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const serialized = JSON.stringify(params)
  const refresh = useCallback(async () => setRevision((value) => value + 1), [])
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    const controller = new AbortController()
    const filters = JSON.parse(serialized)
    const datePairs = [['from', 'to'], ['joinedFrom', 'joinedTo'], ['scheduledFrom', 'scheduledTo']]
    const invalid = datePairs.find(([from, to]) => filters[from] && filters[to] && filters[from] > filters[to])
    if (invalid) {
      setError('The end date must be on or after the start date.')
      setLoading(false)
      return () => controller.abort()
    }
    const queryParams = new URLSearchParams({ page, limit: 25 })
    if (search) queryParams.set('search', search)
    Object.entries(filters).forEach(([name, value]) => { if (value !== '' && value != null) queryParams.set(name, value) })
    setLoading(true)
    setError('')
    apiRequest(`${endpoint}?${queryParams}`, { signal: controller.signal }).then((res) => {
      if (!Array.isArray(res?.data?.[key])) throw new Error('Unexpected list response from the server.')
      if (controller.signal.aborted) return
      setData(res.data)
      const last = Math.max(1, res.data.pagination?.totalPages || 1)
      if (page > last) setPage(last)
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [endpoint, key, serialized, search, page, revision])
  return { rows: data[key] || [], counts: data.counts || {}, pagination: data.pagination, query, setQuery, page, setPage, error, loading, refresh }
}
