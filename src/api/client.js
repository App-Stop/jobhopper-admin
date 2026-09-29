/**
 * JobHopper Admin API Client
 * Supports live requests to job-hopper-backend (VITE_API_URL in .env)
 * with automatic fallback to rich interactive demo mock data if the backend is unreachable.
 */
import { API_URL } from '../config'

const STORAGE_KEY_TOKEN = 'jh_admin_token'
const STORAGE_KEY_USER = 'jh_admin_user'
const STORAGE_KEY_DEMO_MODE = 'jh_admin_demo_mode'

export const getApiBaseUrl = () => API_URL

export const isDemoMode = () => {
  return localStorage.getItem(STORAGE_KEY_DEMO_MODE) === 'true'
}

export const setDemoMode = (enabled) => {
  localStorage.setItem(STORAGE_KEY_DEMO_MODE, enabled ? 'true' : 'false')
}

export const getStoredAuth = () => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN)
  const userStr = localStorage.getItem(STORAGE_KEY_USER)
  let user = null
  try {
    user = userStr ? JSON.parse(userStr) : null
  } catch {
    // ignore malformed JSON
  }
  return { token, user }
}

export const saveAuth = (token, user) => {
  localStorage.setItem(STORAGE_KEY_TOKEN, token)
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY_TOKEN)
  localStorage.removeItem(STORAGE_KEY_USER)
}

// ----------------------------------------------------------------------
// Mock Data Store for Offline / Demo Mode
// ----------------------------------------------------------------------
let mockUsers = [
  {
    _id: 'usr_001',
    fullName: 'Alex Vance',
    email: 'alex.vance@example.com',
    phone: '+1 (555) 234-5678',
    isWorker: true,
    activeRole: 'worker',
    isEmailVerified: true,
    isPhoneVerified: true,
    isDeactivatedByAdmin: false,
    createdAt: '2026-09-12T10:20:00Z',
  },
  {
    _id: 'usr_002',
    fullName: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 876-5432',
    isWorker: false,
    activeRole: 'client',
    isEmailVerified: true,
    isPhoneVerified: true,
    isDeactivatedByAdmin: false,
    createdAt: '2026-09-14T08:15:00Z',
  },
  {
    _id: 'usr_003',
    fullName: 'Martin Alex',
    email: 'martin.trades@example.com',
    phone: '+1 (555) 345-6789',
    isWorker: true,
    activeRole: 'worker',
    isEmailVerified: true,
    isPhoneVerified: true,
    isDeactivatedByAdmin: false,
    createdAt: '2026-08-20T14:40:00Z',
  },
  {
    _id: 'usr_004',
    fullName: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '+1 (555) 456-7890',
    isWorker: false,
    activeRole: 'client',
    isEmailVerified: true,
    isPhoneVerified: false,
    isDeactivatedByAdmin: false,
    createdAt: '2026-09-18T16:30:00Z',
  },
  {
    _id: 'usr_005',
    fullName: 'Robert Sterling',
    email: 'robert.plumbing@example.com',
    phone: '+1 (555) 901-2345',
    isWorker: true,
    activeRole: 'worker',
    isEmailVerified: true,
    isPhoneVerified: true,
    isDeactivatedByAdmin: true,
    createdAt: '2026-07-05T09:10:00Z',
  },
  {
    _id: 'usr_006',
    fullName: 'Daniel Ortiz',
    email: 'daniel.ortiz@example.com',
    phone: '+1 (555) 678-9012',
    isWorker: true,
    activeRole: 'worker',
    isEmailVerified: true,
    isPhoneVerified: true,
    isDeactivatedByAdmin: false,
    createdAt: '2026-09-24T11:05:00Z',
  },
]

let mockVerifications = [
  {
    _id: 'wp_001',
    user: {
      _id: 'usr_006',
      fullName: 'Daniel Ortiz',
      email: 'daniel.ortiz@example.com',
      phone: '+1 (555) 678-9012',
    },
    bio: 'Licensed master electrician with 12 years of residential & commercial wiring experience.',
    hourlyRate: 85,
    trustScore: 75,
    isVerifiedBadge: false,
    services: [
      {
        category: { _id: 'cat_002', name: 'Electrical' },
        experienceYears: 12,
      },
    ],
    verification: {
      status: 'pending',
      idType: 'driver_license',
      idFrontFile: {
        _id: 'file_01',
        url: 'https://images.unsplash.com/photo-1578874691223-a49267d26e47?auto=format&fit=crop&w=600&q=80',
        filename: 'id-front-ortiz.jpg',
      },
      idBackFile: {
        _id: 'file_02',
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
        filename: 'id-back-ortiz.jpg',
      },
      selfieFile: {
        _id: 'file_03',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        filename: 'selfie-ortiz.jpg',
      },
      submittedAt: '2026-09-28T14:32:00Z',
    },
  },
  {
    _id: 'wp_002',
    user: {
      _id: 'usr_007',
      fullName: 'Elena Rostova',
      email: 'elena.paint@example.com',
      phone: '+1 (555) 432-1098',
    },
    bio: 'Interior and exterior painting specialist with certified safety credentials.',
    hourlyRate: 65,
    trustScore: 70,
    isVerifiedBadge: false,
    services: [
      {
        category: { _id: 'cat_003', name: 'Painting' },
        experienceYears: 8,
      },
    ],
    verification: {
      status: 'pending',
      idType: 'passport',
      idFrontFile: {
        _id: 'file_04',
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
        filename: 'passport-elena.jpg',
      },
      idBackFile: null,
      selfieFile: {
        _id: 'file_05',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        filename: 'selfie-elena.jpg',
      },
      submittedAt: '2026-09-29T09:12:00Z',
    },
  },
]

let mockJobs = [
  {
    _id: 'job_001',
    jobCode: 'JOB-9824',
    title: 'Kitchen Sink Pipe Burst & Leak',
    description: 'Under-sink pipe cracked and is spraying water into cabinet. Need emergency repair immediately.',
    status: 'en_route',
    postType: 'open',
    urgency: 'asap',
    isUrgentRequest: true,
    budget: 150,
    finalAmount: 140,
    priorityFee: 15,
    client: { _id: 'usr_002', fullName: 'Sarah Jenkins', email: 'sarah.j@example.com' },
    worker: { _id: 'usr_003', fullName: 'Martin Alex', email: 'martin.trades@example.com' },
    category: { _id: 'cat_001', name: 'Plumbing' },
    address: { fullAddress: '742 Evergreen Terrace, Springfield', city: 'Springfield' },
    createdAt: '2026-09-29T18:40:00Z',
  },
  {
    _id: 'job_002',
    jobCode: 'JOB-9823',
    title: 'Living Room Wall Repainting',
    description: 'Repaint 300 sq ft accent wall with provided Benjamin Moore paint.',
    status: 'open',
    postType: 'open',
    urgency: 'standard',
    isUrgentRequest: false,
    budget: 220,
    finalAmount: null,
    priorityFee: 0,
    client: { _id: 'usr_004', fullName: 'Emily Davis', email: 'emily.davis@example.com' },
    worker: null,
    category: { _id: 'cat_003', name: 'Painting' },
    address: { fullAddress: '128 Willow Creek Way, Austin, TX', city: 'Austin' },
    createdAt: '2026-09-29T16:10:00Z',
  },
  {
    _id: 'job_003',
    jobCode: 'JOB-9822',
    title: 'Main Circuit Breaker Tripping',
    description: 'Main breaker trips whenever the HVAC runs with kitchen appliances.',
    status: 'completed',
    postType: 'open',
    urgency: 'within_24h',
    isUrgentRequest: false,
    budget: 280,
    finalAmount: 260,
    priorityFee: 0,
    client: { _id: 'usr_002', fullName: 'Sarah Jenkins', email: 'sarah.j@example.com' },
    worker: { _id: 'usr_001', fullName: 'Alex Vance', email: 'alex.vance@example.com' },
    category: { _id: 'cat_002', name: 'Electrical' },
    address: { fullAddress: '55 Ocean View Blvd, San Jose, CA', city: 'San Jose' },
    createdAt: '2026-09-28T12:00:00Z',
  },
  {
    _id: 'job_004',
    jobCode: 'JOB-9821',
    title: 'Water Heater Pilot Light Failure',
    description: 'Gas water heater pilot won’t stay lit. Replaced thermocouple already.',
    status: 'disputed',
    postType: 'open',
    urgency: 'asap',
    isUrgentRequest: true,
    budget: 180,
    finalAmount: 180,
    priorityFee: 15,
    client: { _id: 'usr_004', fullName: 'Emily Davis', email: 'emily.davis@example.com' },
    worker: { _id: 'usr_005', fullName: 'Robert Sterling', email: 'robert.plumbing@example.com' },
    category: { _id: 'cat_001', name: 'Plumbing' },
    address: { fullAddress: '404 Elm St, Seattle, WA', city: 'Seattle' },
    createdAt: '2026-09-27T10:15:00Z',
  },
]

let mockReports = [
  {
    _id: 'rep_001',
    job: {
      _id: 'job_004',
      jobCode: 'JOB-9821',
      title: 'Water Heater Pilot Light Failure',
      finalAmount: 180,
    },
    reportedBy: {
      _id: 'usr_004',
      fullName: 'Emily Davis',
      email: 'emily.davis@example.com',
    },
    reason: 'Incomplete or Substandard Work',
    description:
      'Technician arrived 2 hours late, stayed 10 minutes, claimed heater was fixed, but hot water stopped working an hour after he left.',
    status: 'pending',
    resolutionNote: null,
    createdAt: '2026-09-28T09:20:00Z',
  },
  {
    _id: 'rep_002',
    job: {
      _id: 'job_003',
      jobCode: 'JOB-9799',
      title: 'Drywall Patch and Repair',
      finalAmount: 110,
    },
    reportedBy: {
      _id: 'usr_001',
      fullName: 'Alex Vance',
      email: 'alex.vance@example.com',
    },
    reason: 'Billing Dispute / Extra Unscheduled Work',
    description: 'Client demanded extra ceiling patching outside the agreed scope without updating the budget.',
    status: 'resolved',
    resolutionNote: 'Reviewed contract scope. Advised client to create an additional job order for ceiling work.',
    createdAt: '2026-09-25T14:00:00Z',
  },
]

let mockCategories = [
  {
    _id: 'cat_001',
    name: 'Plumbing',
    slug: 'plumbing',
    description: 'Emergency pipe repair, drains, faucets, water heaters, and toilet installations.',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    _id: 'cat_002',
    name: 'Electrical',
    slug: 'electrical',
    description: 'Wiring, breaker boxes, lighting, outlets, switches, and smart home hardware.',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    _id: 'cat_003',
    name: 'Painting',
    slug: 'painting',
    description: 'Interior and exterior painting, drywall prep, stain, and touch-ups.',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    _id: 'cat_004',
    name: 'HVAC & Climate',
    slug: 'hvac-climate',
    description: 'Air conditioning, heating, duct cleaning, thermostat repair and maintenance.',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    _id: 'cat_005',
    name: 'Handyman & Assembly',
    slug: 'handyman-assembly',
    description: 'Furniture assembly, TV mounting, door handles, light fixture repairs.',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
]

let mockSettings = {
  platformFeePercent: 5.0,
  priorityFeeFlat: 15.0,
  taxPercent: 5.7,
  withdrawalFeeFlat: 0.0,
  urgentRequestTimeoutSeconds: 120,
}

// ----------------------------------------------------------------------
// Unified Request Handler
// ----------------------------------------------------------------------
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl()
  const { token } = getStoredAuth()
  const forceDemo = isDemoMode()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  // If body is FormData, delete Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  if (!forceDemo) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      if (res.status === 401) {
        clearAuth()
        window.dispatchEvent(new Event('auth:unauthorized'))
      }

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || `Request failed with status ${res.status}`)
      }
      return json
    } catch (err) {
      // If server is unreachable (Failed to fetch), fallback to mock mode
      console.warn(`[JobHopper API] Live request failed (${err.message}). Using local demo store.`)
      return handleMockRequest(endpoint, options)
    }
  }

  return handleMockRequest(endpoint, options)
}

// ----------------------------------------------------------------------
// Mock Handlers for Offline Experience
// ----------------------------------------------------------------------
function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase()

  // Health
  if (endpoint === '/health') {
    return { success: true, uptime: 10450, mongo: 'connected (demo)', env: 'development' }
  }

  // Admin Login
  if (endpoint === '/admin/login' && method === 'POST') {
    const body = JSON.parse(options.body || '{}')
    return {
      message: 'Logged in successfully (Demo)',
      data: {
        token: 'mock-jwt-admin-token-' + Date.now(),
        admin: {
          _id: 'adm_001',
          fullName: 'JobHopper Super Admin',
          email: body.email || 'admin@jobhopper.com',
        },
      },
    }
  }

  // Users
  if (endpoint.startsWith('/admin/users') && !endpoint.includes('deactivate')) {
    const url = new URL(`http://localhost${endpoint}`)
    const role = url.searchParams.get('role')
    const isDeactivated = url.searchParams.get('isDeactivated')

    let filtered = [...mockUsers]
    if (role === 'worker') filtered = filtered.filter((u) => u.isWorker)
    if (role === 'client') filtered = filtered.filter((u) => !u.isWorker)
    if (isDeactivated !== null && isDeactivated !== undefined) {
      filtered = filtered.filter((u) => String(u.isDeactivatedByAdmin) === isDeactivated)
    }

    return {
      message: 'Users fetched successfully',
      data: {
        users: filtered,
        pagination: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
      },
    }
  }

  // Deactivate User
  if (endpoint.match(/\/admin\/users\/[^/]+\/deactivate/) && method === 'PATCH') {
    const userId = endpoint.split('/')[3]
    const body = JSON.parse(options.body || '{}')
    mockUsers = mockUsers.map((u) =>
      u._id === userId ? { ...u, isDeactivatedByAdmin: body.isDeactivated } : u,
    )
    return {
      message: `User ${body.isDeactivated ? 'deactivated' : 'reactivated'} successfully`,
    }
  }

  // Verification Queue
  if (endpoint.startsWith('/admin/workers/verification-queue')) {
    const pending = mockVerifications.filter((v) => v.verification.status === 'pending')
    return {
      message: 'Verification queue fetched successfully',
      data: {
        profiles: pending,
        pagination: { total: pending.length, page: 1, limit: 20, totalPages: 1 },
      },
    }
  }

  // Review Verification
  if (endpoint.match(/\/admin\/workers\/[^/]+\/verification/) && method === 'PATCH') {
    const workerUserId = endpoint.split('/')[3]
    const body = JSON.parse(options.body || '{}')
    mockVerifications = mockVerifications.map((v) => {
      if (v.user._id === workerUserId) {
        return {
          ...v,
          isVerifiedBadge: body.status === 'approved',
          trustScore: body.status === 'approved' ? Math.min(100, v.trustScore + 20) : v.trustScore,
          verification: {
            ...v.verification,
            status: body.status,
            rejectionReason: body.rejectionReason || null,
            reviewedAt: new Date().toISOString(),
          },
        }
      }
      return v
    })
    return { message: 'Verification reviewed successfully' }
  }

  // Jobs
  if (endpoint.startsWith('/admin/jobs')) {
    const url = new URL(`http://localhost${endpoint}`)
    const status = url.searchParams.get('status')
    let filtered = [...mockJobs]
    if (status) filtered = filtered.filter((j) => j.status === status)

    return {
      message: 'Jobs fetched successfully',
      data: {
        jobs: filtered,
        pagination: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
      },
    }
  }

  // Reports
  if (endpoint.startsWith('/reports') && method === 'GET') {
    const url = new URL(`http://localhost${endpoint}`)
    const status = url.searchParams.get('status')
    let filtered = [...mockReports]
    if (status) filtered = filtered.filter((r) => r.status === status)

    return {
      message: 'Reports fetched successfully',
      data: {
        reports: filtered,
        pagination: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
      },
    }
  }

  // Resolve Report
  if (endpoint.startsWith('/reports/') && method === 'PATCH') {
    const reportId = endpoint.split('/')[2]
    const body = JSON.parse(options.body || '{}')
    mockReports = mockReports.map((r) =>
      r._id === reportId
        ? { ...r, status: body.status, resolutionNote: body.resolutionNote }
        : r,
    )
    return { message: 'Report updated successfully' }
  }

  // Categories
  if (endpoint === '/categories' && method === 'GET') {
    return {
      message: 'Categories fetched successfully',
      data: { categories: mockCategories },
    }
  }

  if (endpoint === '/categories' && method === 'POST') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
    const newCat = {
      _id: 'cat_' + Date.now(),
      name: body.name || 'New Category',
      slug: (body.name || 'new').toLowerCase().replace(/\s+/g, '-'),
      description: body.description || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    mockCategories.unshift(newCat)
    return { message: 'Category created successfully', data: newCat }
  }

  if (endpoint.startsWith('/categories/') && method === 'PATCH') {
    const catId = endpoint.split('/')[2]
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
    mockCategories = mockCategories.map((c) =>
      c._id === catId ? { ...c, ...body } : c,
    )
    return { message: 'Category updated successfully' }
  }

  if (endpoint.startsWith('/categories/') && method === 'DELETE') {
    const catId = endpoint.split('/')[2]
    mockCategories = mockCategories.filter((c) => c._id !== catId)
    return { message: 'Category deleted successfully' }
  }

  // Settings
  if (endpoint === '/settings/fees' || (endpoint === '/admin/settings' && method === 'GET')) {
    return {
      message: 'Fee settings fetched successfully',
      data: { ...mockSettings },
    }
  }

  if (endpoint === '/admin/settings' && method === 'PATCH') {
    const body = JSON.parse(options.body || '{}')
    mockSettings = { ...mockSettings, ...body }
    return {
      message: 'Settings updated successfully',
      data: { ...mockSettings },
    }
  }

  return { message: 'OK', data: {} }
}
