import { useState, useRef } from 'react'
import { FileText, X, AlertCircle, ExternalLink } from 'lucide-react'
import { validateFile, uploadFile, deleteFile } from '../../../firebase/storage'
import { generateUniqueFilename, sanitizeText } from '../../../utils/sanitize'

export default function PDFUploader({
  value,
  onChange,
  onDelete,
  disabled = false,
  path = 'pdfs',
  maxSizeMB = 50
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    setError(null)

    // Validate file
    const errors = validateFile(file, 'pdf')
    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const filename = generateUniqueFilename(file.name, 'pdf')
      const fullPath = `${path}/${filename}`
      const url = await uploadFile(file, fullPath, setProgress)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    // Warn user if multiple files dropped
    if (e.dataTransfer.files.length > 1) {
      setError('Only one file can be uploaded at a time. Using the first file.')
    }
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleRemove = async () => {
    if (value && onDelete) {
      try {
        await deleteFile(value)
      } catch (err) {
        // Warn user but continue with removal from form
        console.warn('Failed to delete PDF from storage:', err)
        setError('File removed from form, but could not delete from storage. Contact admin if this persists.')
      }
    }
    onChange('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // Extract filename from URL (sanitized to prevent XSS)
  const getFilename = (url) => {
    try {
      const decoded = decodeURIComponent(url)
      const match = decoded.match(/\/([^/?]+)\?/)
      // Sanitize to prevent XSS from malicious filenames
      return match ? sanitizeText(match[1]) : 'Document.pdf'
    } catch {
      return 'Document.pdf'
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg group">
          <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {getFilename(value)}
            </p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gold hover:text-gold-dark flex items-center gap-1"
            >
              View PDF
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
            aria-label="Remove PDF"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-gold bg-gold/5'
              : 'border-white/10 hover:border-white/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <div className="space-y-3">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
              <div className="text-sm text-gray-400">
                Uploading... {progress}%
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PDF only (max {maxSizeMB}MB)
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            disabled={disabled || uploading}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
