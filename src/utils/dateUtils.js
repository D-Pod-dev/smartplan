// Date utility that allows overriding the current date for debugging
let debugDateOverride = null

export const setDebugDate = (isoDate) => {
  debugDateOverride = isoDate
  if (typeof localStorage !== 'undefined') {
    if (isoDate) {
      localStorage.setItem('smartplan.debug.date', isoDate)
    } else {
      localStorage.removeItem('smartplan.debug.date')
    }
  }
}

export const getDebugDate = () => {
  if (debugDateOverride) return debugDateOverride
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.debug.date')
    if (saved) {
      debugDateOverride = saved
      return saved
    }
  }
  return null
}

export const getCurrentDate = () => {
  const override = getDebugDate()
  if (override) {
    return new Date(`${override}T00:00:00`)
  }
  return new Date()
}

export const clearDebugDate = () => {
  debugDateOverride = null
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('smartplan.debug.date')
  }
}
