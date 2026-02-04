import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage'
import { storage } from './config'

// File type validation
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
const MAX_PDF_SIZE = 50 * 1024 * 1024    // 50MB

// Validate file before upload
export function validateFile(file, type) {
  const errors = []

  // Check for empty or missing file
  if (!file) {
    errors.push('No file selected.')
    return errors
  }

  if (file.size === 0) {
    errors.push('File is empty. Please select a valid file.')
    return errors
  }

  if (type === 'video') {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      errors.push('Invalid video format. Use MP4, WebM, or MOV.')
    }
    if (file.size > MAX_VIDEO_SIZE) {
      errors.push('Video must be under 500MB.')
    }
    if (file.size < 1024) { // Less than 1KB is suspicious for video
      errors.push('Video file appears to be corrupted or too small.')
    }
  } else if (type === 'image') {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.push('Invalid image format. Use JPG, PNG, WebP, or GIF.')
    }
    if (file.size > MAX_IMAGE_SIZE) {
      errors.push('Image must be under 10MB.')
    }
    if (file.size < 100) { // Less than 100 bytes is suspicious for image
      errors.push('Image file appears to be corrupted or too small.')
    }
  } else if (type === 'pdf') {
    if (file.type !== 'application/pdf') {
      errors.push('Invalid file format. Only PDF allowed.')
    }
    if (file.size > MAX_PDF_SIZE) {
      errors.push('PDF must be under 50MB.')
    }
    if (file.size < 100) { // Less than 100 bytes is suspicious for PDF
      errors.push('PDF file appears to be corrupted or too small.')
    }
  }

  return errors
}

// Upload with progress callback
export function uploadFile(file, path, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path)
    const uploadTask = uploadBytesResumable(storageRef, file)

    // Store unsubscribe function to prevent memory leaks
    const unsubscribe = uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        )
        onProgress?.(progress)
      },
      (error) => {
        unsubscribe() // Cleanup listener on error
        reject(new Error(getUploadErrorMessage(error.code)))
      },
      async () => {
        unsubscribe() // Cleanup listener on success
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(url)
        } catch (error) {
          reject(new Error('Failed to get download URL'))
        }
      }
    )
  })
}

// Delete file
export async function deleteFile(url) {
  try {
    // Extract the path from the URL
    const fileRef = ref(storage, getPathFromUrl(url))
    await deleteObject(fileRef)
  } catch (error) {
    // Ignore if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      throw error
    }
  }
}

// List all files in a directory (recursive)
export async function listFiles(path) {
  const listRef = ref(storage, path)
  const result = await listAll(listRef)

  // Get files at this level
  const filePromises = result.items.map(async (item) => {
    const url = await getDownloadURL(item)
    return {
      name: item.name,
      fullPath: item.fullPath,
      url
    }
  })

  // Recursively get files from subdirectories
  const subfolderPromises = result.prefixes.map(async (prefix) => {
    return listFiles(prefix.fullPath)
  })

  const [fileResults, subfolderResults] = await Promise.all([
    Promise.allSettled(filePromises),
    Promise.all(subfolderPromises)
  ])

  // Combine files from this level and all subfolders
  const files = fileResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)

  const subfolderFiles = subfolderResults.flat()

  return [...files, ...subfolderFiles]
}

// Get storage path from download URL
function getPathFromUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided')
  }

  try {
    // Firebase Storage URLs contain the path encoded after /o/
    const matches = url.match(/\/o\/(.+?)(\?|$)/)
    if (matches && matches[1]) {
      return decodeURIComponent(matches[1])
    }

    // If it's already a path (starts with videos/, images/, pdfs/)
    if (url.match(/^(videos|images|pdfs)\//)) {
      return url
    }

    throw new Error('Could not extract path from URL')
  } catch (error) {
    console.error('Error parsing storage URL:', error)
    throw new Error('Invalid storage URL format')
  }
}

// Human-readable error messages
function getUploadErrorMessage(code) {
  switch (code) {
    case 'storage/unauthorized':
      return 'You do not have permission to upload files.'
    case 'storage/canceled':
      return 'Upload was cancelled.'
    case 'storage/quota-exceeded':
      return 'Storage quota exceeded. Contact support.'
    case 'storage/retry-limit-exceeded':
      return 'Upload failed after multiple attempts. Please try again.'
    case 'storage/invalid-checksum':
      return 'File was corrupted during upload. Please try again.'
    default:
      return 'Upload failed. Please try again.'
  }
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Get file type category
export function getFileCategory(mimeType) {
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video'
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'unknown'
}
