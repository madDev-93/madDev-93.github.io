// Strip HTML tags to prevent XSS
export function sanitizeText(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

// Sanitize for display (escape HTML entities)
export function escapeHtml(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Validate and sanitize URL
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return ''
  const trimmed = url.trim()

  // Only allow http, https, or storage URLs
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('gs://')
  ) {
    return trimmed
  }

  return ''
}

// Instagram handle validation
export function sanitizeInstagramHandle(handle) {
  if (typeof handle !== 'string') return ''
  // Remove @ if present, only allow valid characters
  return handle
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9._]/g, '')
    .toLowerCase()
    .slice(0, 30)
}

// Sanitize filename for storage
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'file'
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100)
}

// Allowed file extensions by type
const ALLOWED_EXTENSIONS = {
  video: ['mp4', 'webm', 'mov'],
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  pdf: ['pdf']
}

// Generate a unique filename with timestamp
// type parameter validates extension against whitelist
export function generateUniqueFilename(originalName, type = null) {
  const timestamp = Date.now()
  const ext = (originalName.split('.').pop() || '').toLowerCase()
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  const sanitizedBase = sanitizeFilename(baseName)

  // Validate extension against whitelist if type provided
  if (type && ALLOWED_EXTENSIONS[type]) {
    const allowedExts = ALLOWED_EXTENSIONS[type]
    if (!allowedExts.includes(ext)) {
      // Use default safe extension for the type
      const safeExt = allowedExts[0]
      return `${sanitizedBase}_${timestamp}.${safeExt}`
    }
  }

  // Sanitize extension to only allow alphanumeric
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'bin'
  return `${sanitizedBase}_${timestamp}.${safeExt}`
}
