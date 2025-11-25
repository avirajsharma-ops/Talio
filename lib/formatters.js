/**
 * Format designation with level name in format: (Level Name) - Title
 * @param {Object|string} designation - Designation object or string
 * @returns {string} Formatted designation string
 */
export const formatDesignation = (designation) => {
  if (!designation) return 'N/A'

  // Handle if designation is a string
  if (typeof designation === 'string') return designation

  // Handle if designation is an object
  const title = designation.title || designation
  const levelName = designation.levelName || getLevelNameFromNumber(designation.level)

  // Format: (Level Name) - Title
  if (levelName && title) {
    return `(${levelName}) - ${title}`
  }

  return title || 'N/A'
}

/**
 * Get level name from level number
 * @param {number} level - Level number (1-8)
 * @returns {string} Level name
 */
const getLevelNameFromNumber = (level) => {
  const levelMap = {
    1: 'Entry Level',
    2: 'Junior',
    3: 'Mid Level',
    4: 'Senior',
    5: 'Lead',
    6: 'Manager',
    7: 'Director',
    8: 'Executive'
  }
  return levelMap[level] || ''
}

/**
 * Format employee full name
 * @param {Object} employee - Employee object with firstName and lastName
 * @returns {string} Full name
 */
export const formatEmployeeName = (employee) => {
  if (!employee) return 'N/A'
  const firstName = employee.firstName || ''
  const lastName = employee.lastName || ''
  return `${firstName} ${lastName}`.trim() || 'N/A'
}

