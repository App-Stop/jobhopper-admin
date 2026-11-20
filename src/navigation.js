// Path router for the JobHopper admin app — identical to cozy-admin navigation pattern.
export const adminPaths = {
  dashboard: '/',
  verifications: '/verifications',
  users: '/users',
  jobs: '/jobs',
  openRequests: '/open-requests',
  payouts: '/payouts',
  disputes: '/disputes',
  notifications: '/notifications',
  categories: '/categories',
  supportTickets: '/support-tickets',
  userReports: '/user-reports',
  settings: '/settings',
  account: '/account',
}

const PAGES = Object.fromEntries(Object.entries(adminPaths).map(([page, path]) => [path, page]))

export const currentAdminPage = () =>
  PAGES[window.location.pathname.replace(/(.)\/+$/, '$1')] ?? 'dashboard'

export const navigateAdmin = (path) => {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// Builds a link that opens a list page on one of its tabs, e.g. `/jobs?tab=Active`.
export const tabPath = (path, tab) => `${path}?${new URLSearchParams({ tab })}`

// The `?tab=` the page was opened with, when it is one of `allowed`; otherwise `fallback`.
export const initialTab = (allowed, fallback = 'All') => {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return allowed.includes(tab) ? tab : fallback
}

// onClick for in-app `<a>` links: keeps modifier-clicks (new tab) working.
export const adminLinkClick = (path) => (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  navigateAdmin(path)
}
