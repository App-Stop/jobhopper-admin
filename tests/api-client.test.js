import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'

const source = (await readFile(new URL('../src/api/client.js', import.meta.url), 'utf8'))
  .replace("import { API_URL } from '../config'", "const API_URL = 'https://api.test'")
  .replace(/export /g, '') + '\nglobalThis.client = { apiRequest, apiFileObjectUrl, apiRequestAll, saveAuth, getStoredAuth };'
function setup(fetch) {
  const storage = new Map()
  const events = []
  const localStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }
  const context = vm.createContext({ fetch, localStorage, sessionStorage: localStorage, window: { dispatchEvent: (event) => events.push(event.type) }, URL, URLSearchParams, FormData, Event })
  vm.runInContext(source, context)
  return { ...context.client, events }
}
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('authenticated requests send the bearer token and preserve JSON errors', async () => {
  const api = setup(async (url, options) => {
    assert.equal(url, 'https://api.test/admin/users')
    assert.equal(options.headers.Authorization, 'Bearer secret')
    return response(422, { error: [{ path: 'query.joinedTo', message: 'Invalid date range' }] })
  })
  api.saveAuth({ token: 'secret' })
  await assert.rejects(api.apiRequest('/admin/users'), /joinedTo: Invalid date range/)
  assert.equal(api.getStoredAuth().token, 'secret')
})

test('authenticated 401 clears the session and emits the sign-out event', async () => {
  const api = setup(async () => response(401, { message: 'Session expired' }))
  api.saveAuth({ token: 'secret' })
  await assert.rejects(api.apiRequest('/admin/me'), /Session expired/)
  assert.equal(api.getStoredAuth(), null)
  assert.deepEqual(api.events, ['auth:unauthorized'])
})

test('login failures do not emit a session-expiry event', async () => {
  const api = setup(async () => response(401, { message: 'Bad credentials' }))
  await assert.rejects(api.apiRequest('/admin/login', { method: 'POST' }), /Bad credentials/)
  assert.deepEqual(api.events, [])
})

test('category multipart uploads allow the browser to set the boundary', async () => {
  const body = new FormData()
  body.set('name', 'Plumbing')
  body.set('sortOrder', '2')
  body.set('icon', new Blob(['image'], { type: 'image/png' }), 'icon.png')
  const api = setup(async (_url, options) => {
    assert.equal(options.headers['Content-Type'], undefined)
    assert.equal(options.body, body)
    assert.equal(options.method, 'POST')
    return response(201, { data: { _id: 'category' } })
  })
  await api.apiRequest('/categories', { method: 'POST', body })
})

test('paginated helper loads every page and preserves filters', async () => {
  let calls = 0
  const api = setup(async (url) => {
    const params = new URL(url).searchParams
    assert.equal(params.get('role'), 'worker')
    assert.equal(params.get('limit'), '100')
    calls++
    return response(200, { data: { users: [{ _id: params.get('page') }], pagination: { totalPages: 2 } } })
  })
  const items = await api.apiRequestAll('/admin/users', 'users', { role: 'worker' })
  assert.equal(calls, 2)
  assert.equal(items.map((item) => item._id).join(','), '1,2')
})

test('malformed lists display an error instead of looking empty', async () => {
  const api = setup(async () => response(200, { data: {} }))
  await assert.rejects(api.apiRequestAll('/admin/categories', 'categories'), /Unexpected list response/)
})

test('aborted requests retain cancellation and network errors have a useful message', async () => {
  const aborted = new DOMException('Cancelled', 'AbortError')
  const api = setup(async () => { throw aborted })
  await assert.rejects(api.apiRequest('/admin/jobs'), (err) => err === aborted)
  const offline = setup(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(offline.apiRequest('/admin/jobs'), /Cannot reach the JobHopper server/)
})

test('private-file authentication failures also sign out the admin', async () => {
  const api = setup(async () => response(401, { message: 'Session expired' }))
  api.saveAuth({ token: 'secret' })
  await assert.rejects(api.apiFileObjectUrl('document'), /Session expired/)
  assert.equal(api.getStoredAuth(), null)
  assert.deepEqual(api.events, ['auth:unauthorized'])
})

test('verification conflict and missing-record errors preserve HTTP status for recovery', async () => {
  for (const status of [400, 404, 422, 500]) {
    const api = setup(async () => response(status, { message: 'Verification error' }))
    await assert.rejects(api.apiRequest('/admin/verifications/verification-id'), (error) => error.status === status && error.message === 'Verification error')
  }
})

test('forbidden requests show access denied', async () => {
  const api = setup(async () => response(403, { message: 'Forbidden' }))
  await assert.rejects(api.apiRequest('/admin/verifications'), (error) => error.status === 403 && error.message === 'Access denied')
})
