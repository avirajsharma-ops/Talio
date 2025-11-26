// Cache management utilities

export const clearAllCache = () => {
  try {
    // Clear localStorage except for essential items
    const essentialKeys = ['token', 'user']
    const allKeys = Object.keys(localStorage)
    
    allKeys.forEach(key => {
      if (!essentialKeys.includes(key)) {
        localStorage.removeItem(key)
      }
    })

    // Clear sessionStorage
    sessionStorage.clear()

    // Force reload without cache
    if (typeof window !== 'undefined') {
      window.location.reload(true)
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

export const clearTaskCache = () => {
  try {
    const taskKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('task_') || 
      key.startsWith('tasks_') ||
      key.includes('dashboard')
    )
    
    taskKeys.forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Error clearing task cache:', error)
  }
}

export const addCacheBuster = (url) => {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_t=${Date.now()}`
}

export const getWithCacheBuster = async (url, options = {}) => {
  const busteredUrl = addCacheBuster(url)
  return fetch(busteredUrl, {
    ...options,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers
    }
  })
}
