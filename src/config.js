// Runtime URLs, read from .env (see .env.example). Vite only exposes VITE_-prefixed vars.
const trimSlash = (url) => url.replace(/\/+$/, '')

export const API_URL = trimSlash(import.meta.env.VITE_API_URL || 'http://localhost:3050')

export const MARKETPLACE_URL = trimSlash(import.meta.env.VITE_MARKETPLACE_URL || 'http://localhost:5173')
