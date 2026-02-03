import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { listFiles, deleteFile, formatFileSize } from '../../firebase/storage'
import ImageUploader from '../../components/admin/shared/ImageUploader'
import VideoUploader from '../../components/admin/shared/VideoUploader'
import PDFUploader from '../../components/admin/shared/PDFUploader'
import {
  AlertCircle,
  Image,
  Video,
  FileText,
  Trash2,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Copy,
  Check
} from 'lucide-react'

const TABS = [
  { id: 'images', label: 'Images', icon: Image, path: 'images' },
  { id: 'videos', label: 'Videos', icon: Video, path: 'videos' },
  { id: 'pdfs', label: 'PDFs', icon: FileText, path: 'pdfs' }
]

export default function MediaLibrary() {
  const [activeTab, setActiveTab] = useState('images')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(null)
  const [showUploader, setShowUploader] = useState(false)
  const copyTimerRef = useRef(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  // Handle ESC key to close delete modal
  useEffect(() => {
    if (!deleteConfirm) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDeleteConfirm(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [deleteConfirm])

  useEffect(() => {
    let cancelled = false

    const loadFiles = async () => {
      setLoading(true)
      setError(null)

      try {
        const tab = TABS.find(t => t.id === activeTab)
        const fileList = await listFiles(tab.path)
        if (mountedRef.current && !cancelled) {
          setFiles(fileList)
        }
      } catch (err) {
        if (mountedRef.current && !cancelled) {
          setError(err.message)
          setFiles([])
        }
      } finally {
        if (mountedRef.current && !cancelled) {
          setLoading(false)
        }
      }
    }

    loadFiles()

    return () => {
      cancelled = true
    }
  }, [activeTab])

  const loadFiles = async () => {
    setLoading(true)
    setError(null)

    try {
      const tab = TABS.find(t => t.id === activeTab)
      const fileList = await listFiles(tab.path)
      if (mountedRef.current) {
        setFiles(fileList)
      }
    } catch (err) {
      console.error('Error loading files:', err)
      if (mountedRef.current) {
        setError(err.message)
        setFiles([])
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleDelete = async (file) => {
    setDeleting(true)
    try {
      await deleteFile(file.url)
      if (mountedRef.current) {
        setFiles(prev => prev.filter(f => f.fullPath !== file.fullPath))
        setDeleteConfirm(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message)
      }
    } finally {
      if (mountedRef.current) {
        setDeleting(false)
      }
    }
  }

  const handleCopyUrl = async (url) => {
    // Clear any existing timer
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current)
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      copyTimerRef.current = setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      try {
        textArea.select()
        document.execCommand('copy')
        setCopiedUrl(url)
        copyTimerRef.current = setTimeout(() => setCopiedUrl(null), 2000)
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  const handleUploadComplete = (url) => {
    setShowUploader(false)
    loadFiles()
  }

  const renderUploader = () => {
    const tab = TABS.find(t => t.id === activeTab)

    switch (activeTab) {
      case 'images':
        return (
          <ImageUploader
            value=""
            onChange={handleUploadComplete}
            path={tab.path}
          />
        )
      case 'videos':
        return (
          <VideoUploader
            value=""
            onChange={handleUploadComplete}
            path={tab.path}
          />
        )
      case 'pdfs':
        return (
          <PDFUploader
            value=""
            onChange={handleUploadComplete}
            path={tab.path}
          />
        )
      default:
        return null
    }
  }

  const renderFilePreview = (file) => {
    switch (activeTab) {
      case 'images':
        return (
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-32 object-cover rounded-lg"
          />
        )
      case 'videos':
        return (
          <div className="w-full h-32 bg-black rounded-lg flex items-center justify-center">
            <Video className="w-10 h-10 text-gray-600" />
          </div>
        )
      case 'pdfs':
        return (
          <div className="w-full h-32 bg-red-500/10 rounded-lg flex items-center justify-center">
            <FileText className="w-10 h-10 text-red-400" />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Media Library</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage uploaded images, videos, and PDFs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {showUploader ? 'Cancel' : 'Upload New'}
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setShowUploader(false)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold/10 text-gold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Uploader */}
        {showUploader && (
          <div className="bg-dark-tertiary border border-white/5 rounded-xl p-6">
            <h3 className="font-medium mb-4">Upload {activeTab.slice(0, -1)}</h3>
            {renderUploader()}
          </div>
        )}

        {/* Files grid */}
        {loading && !showUploader ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 bg-dark-tertiary border border-white/5 rounded-xl">
            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No {activeTab} uploaded yet</p>
            <button
              onClick={() => setShowUploader(true)}
              className="text-gold hover:text-gold-dark transition-colors"
            >
              Upload your first {activeTab.slice(0, -1)}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map(file => (
              <div
                key={file.fullPath}
                className="group bg-dark-tertiary border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors"
              >
                {renderFilePreview(file)}
                <div className="p-3">
                  <p className="text-sm font-medium truncate mb-2" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyUrl(file.url)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrl === file.url ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setDeleteConfirm(file)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          >
            <div className="bg-dark-tertiary border border-white/10 rounded-xl p-6 max-w-sm w-full">
              <h3 id="delete-modal-title" className="font-semibold mb-2">Delete File?</h3>
              <p className="text-sm text-gray-400 mb-2">
                This will permanently delete "{deleteConfirm.name}".
              </p>
              <p className="text-sm text-red-400 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
