// Path router for the JobHopper admin app — identical to cozy-admin navigation pattern.
export const adminPaths = {
  dashboard: '/',
  verifications: '/verifications',
  users: '/users',
  jobs: '/jobs',
  disputes: '/disputes',
  categories: '/categories',
  settings: '/settings',
}

const PAGES = Object.fromEntries(Object.entries(adminPaths).map(([page, path]) => [path, page]))

export const currentAdminPage = () =>
  PAGES[window.location.pathname.replace(/(.)\/+$/, '$1')] ?? 'dashboard'

export const navigateAdmin = (path) => {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// onClick for in-app `<a>` links: keeps modifier-clicks (new tab) working.
export const adminLinkClick = (path) => (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  navigateAdmin(path)
}
