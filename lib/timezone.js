/**
 * Timezone utility for IST (Indian Standard Time)
 * All date/time functions should use this utility to ensure consistent IST timezone
 */

// IST timezone identifier
export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date/time in IST
 * @returns {Date} Date object with IST time
 */
export function getCurrentISTDate() {
  // Create a date string in IST timezone
  const istDateString = new Date().toLocaleString('en-US', {
    timeZone: IST_TIMEZONE,
  });
  return new Date(istDateString);
}

/**
 * Convert any date to IST Date object
 * @param {Date|string|number} date - Date to convert
 * @returns {Date} Date object with IST time
 */
export function toISTDate(date) {
  const inputDate = new Date(date);
  const istDateString = inputDate.toLocaleString('en-US', {
    timeZone: IST_TIMEZONE,
  });
  return new Date(istDateString);
}

/**
 * Get IST timestamp for session IDs, unique identifiers
 * @returns {number} Timestamp in milliseconds (IST-based)
 */
export function getISTTimestamp() {
  return getCurrentISTDate().getTime();
}

/**
 * Format date to IST string (ISO format)
 * @param {Date|string|number} date - Date to format
 * @returns {string} ISO string in IST
 */
export function toISTString(date = new Date()) {
  const istDate = date ? toISTDate(date) : getCurrentISTDate();
  return istDate.toISOString();
}

/**
 * Format date to locale string in IST
 * @param {Date|string|number} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatISTDate(date, options = {}) {
  const inputDate = date ? new Date(date) : getCurrentISTDate();
  return inputDate.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options,
  });
}

/**
 * Format time only in IST
 * @param {Date|string|number} date - Date to format
 * @param {boolean} use24Hour - Use 24-hour format (default: false)
 * @returns {string} Formatted time string
 */
export function formatISTTime(date, use24Hour = false) {
  const inputDate = date ? new Date(date) : getCurrentISTDate();
  return inputDate.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

/**
 * Get start of day in IST (00:00:00)
 * @param {Date|string|number} date - Date (defaults to today)
 * @returns {Date} Start of day in IST
 */
export function getISTStartOfDay(date = new Date()) {
  const istDate = toISTDate(date);
  istDate.setHours(0, 0, 0, 0);
  return istDate;
}

/**
 * Get end of day in IST (23:59:59)
 * @param {Date|string|number} date - Date (defaults to today)
 * @returns {Date} End of day in IST
 */
export function getISTEndOfDay(date = new Date()) {
  const istDate = toISTDate(date);
  istDate.setHours(23, 59, 59, 999);
  return istDate;
}

/**
 * Get current hour in IST (0-23)
 * @returns {number} Hour in IST
 */
export function getCurrentISTHour() {
  const istDate = getCurrentISTDate();
  return istDate.getHours();
}

/**
 * Get current time in minutes since midnight (IST)
 * @returns {number} Minutes since midnight
 */
export function getCurrentISTMinutesSinceMidnight() {
  const istDate = getCurrentISTDate();
  return istDate.getHours() * 60 + istDate.getMinutes();
}

/**
 * Format date for display (human-readable IST)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export function formatISTDateShort(date) {
  return formatISTDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time for display (human-readable IST)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date and time
 */
export function formatISTDateTime(date) {
  return formatISTDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get time ago string (relative to IST current time)
 * @param {Date|string|number} date - Date to compare
 * @returns {string} Time ago string (e.g., "5 mins ago")
 */
export function getISTTimeAgo(date) {
  const now = getCurrentISTDate();
  const pastDate = new Date(date);
  const diffMs = now - pastDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatISTDateShort(date);
}

/**
 * Get current day of week in IST (0=Sunday, 6=Saturday)
 * @returns {number} Day of week
 */
export function getCurrentISTDayOfWeek() {
  return getCurrentISTDate().getDay();
}

/**
 * Get current day name in IST (lowercase: 'monday', 'tuesday', etc.)
 * @returns {string} Day name
 */
export function getCurrentISTDayName() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[getCurrentISTDayOfWeek()];
}
