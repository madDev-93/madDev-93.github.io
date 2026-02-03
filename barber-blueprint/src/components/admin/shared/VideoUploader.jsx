import { useState, useRef } from 'react'
import { Upload, X, Video, AlertCircle, Play } from 'lucide-react'
import { validateFile, uploadFile, deleteFile, formatFileSize } from '../../../firebase/storage'
import { generateUniqueFilename } from '../../../utils/sanitize'

export default function VideoUploader({
  value,
  onChange,
  onDelete,
  disabled = false,
  path = 'videos',
  maxSizeMB = 500,
  accept = 'video/mp4,video/webm,video/quicktime'
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
    const errors = validateFile(file, 'video')
    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const filename = generateUniqueFilename(file.name, 'video')
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
        console.warn('Failed to delete video from storage:', err)
        setError('File removed from form, but could not delete from storage. Contact admin if this persists.')
      }
    }
    onChange('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group">
          <video
            src={value}
            className="w-full h-48 object-cover rounded-lg border border-white/10 bg-black"
            controls={false}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg group-hover:bg-black/30 transition-colors">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Play video"
            >
              <Play className="w-8 h-8 text-white" />
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            aria-label="Remove video"
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
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-gold bg-gold/5'
              : 'border-white/10 hover:border-white/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <div className="space-y-3">
              <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
              <div className="text-sm text-gray-400">
                Uploading video... {progress}%
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden max-w-sm mx-auto">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Large files may take several minutes
              </p>
            </div>
          ) : (
            <>
              <Video className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-1">
                Drop a video here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                MP4, WebM or MOV (max {maxSizeMB}MB)
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
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
