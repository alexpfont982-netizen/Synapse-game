export function normalizePathname(pathname: string) {
  if (!pathname) return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function navigateTo(
  path: string,
  options?: {
    replace?: boolean
  },
) {
  if (typeof window === 'undefined') {
    return
  }

  const targetPath = normalizePathname(path)
  const currentPath = normalizePathname(window.location.pathname)

  if (currentPath === targetPath) {
    window.scrollTo({ top: 0, behavior: 'auto' })
    return
  }

  if (options?.replace) {
    window.history.replaceState({}, '', targetPath)
  } else {
    window.history.pushState({}, '', targetPath)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'auto' })
}
