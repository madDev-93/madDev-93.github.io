import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useLessons } from '../../hooks/useModules'
import { modules as fallbackModules } from '../../constants/modules'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import TextArea from '../../components/admin/shared/TextArea'
import NumberInput from '../../components/admin/shared/NumberInput'
import SaveButton from '../../components/admin/shared/SaveButton'
import StatusToggle from '../../components/admin/shared/StatusToggle'
import DragDropList from '../../components/admin/shared/DragDropList'
import VideoUploader from '../../components/admin/shared/VideoUploader'
import PreviewModal from '../../components/admin/shared/PreviewModal'
import LessonPreview from '../../components/admin/previews/LessonPreview'
import { sanitizeText } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, Edit2, X, ArrowLeft, Clock, Video, Play, Eye } from 'lucide-react'

export default function LessonsManager() {
  const { moduleId } = useParams()
  const [module, setModule] = useState(null)
  const [moduleLoading, setModuleLoading] = useState(true)

  // Validate moduleId format (alphanumeric, hyphens, underscores only)
  const isValidModuleId = moduleId && typeof moduleId === 'string' && /^[a-zA-Z0-9_-]+$/.test(moduleId)

  const {
    lessons,
    loading,
    error,
    saving,
    addLesson,
    updateLesson,
    deleteLesson,
    reorderLessons
  } = useLessons(isValidModuleId ? moduleId : null)

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    duration: '',
    description: '',
    videoUrl: '',
    order: 1,
    status: 'draft'
  })
  const [formErrors, setFormErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Mounted ref to prevent state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => { mountedRef.current = false }
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

  // Load module info
  useEffect(() => {
    const loadModule = async () => {
      try {
        const moduleDoc = await getDoc(doc(db, 'modules', moduleId))
        if (!mountedRef.current) return
        if (moduleDoc.exists()) {
          setModule({ id: moduleDoc.id, ...moduleDoc.data() })
        } else {
          // Try fallback modules
          const fallback = fallbackModules.find(m => String(m.id) === moduleId)
          if (fallback) {
            setModule({
              id: String(fallback.id),
              number: fallback.number,
              title: fallback.title,
              shortDescription: fallback.shortDescription,
              fullDescription: fallback.fullDescription,
              duration: fallback.duration,
              status: 'published'
            })
          }
        }
      } catch (err) {
        console.error('Error loading module:', err)
        // Try fallback on error
        const fallback = fallbackModules.find(m => String(m.id) === moduleId)
        if (fallback && mountedRef.current) {
          setModule({
            id: String(fallback.id),
            number: fallback.number,
            title: fallback.title,
            shortDescription: fallback.shortDescription,
            fullDescription: fallback.fullDescription,
            duration: fallback.duration,
            status: 'published'
          })
        }
      } finally {
        if (mountedRef.current) {
          setModuleLoading(false)
        }
      }
    }

    if (moduleId) {
      loadModule()
    }
  }, [moduleId])

  const resetForm = () => {
    setFormData({
      title: '',
      duration: '',
      description: '',
      videoUrl: '',
      order: lessons.length + 1,
      status: 'draft'
    })
    setFormErrors({})
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (item) => {
    setFormData({
      title: item.title || '',
      duration: item.duration || '',
      description: item.description || '',
      videoUrl: item.videoUrl || '',
      order: item.order || 1,
      status: item.status || 'draft'
    })
    setEditingId(item.id)
    setIsEditing(true)
    setFormErrors({})
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFormErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const schema = {
      title: [validators.required, validators.maxLength(200)],
      duration: [validators.required, validators.maxLength(20)]
    }
    const errors = validateForm(formData, schema)
    setFormErrors(errors || {})
    return !errors
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaveError(null)

    const order = Number(formData.order)
    if (isNaN(order) || order < 1) {
      setSaveError('Order must be a valid positive number')
      return
    }

    try {
      const sanitizedData = {
        title: sanitizeText(formData.title),
        duration: sanitizeText(formData.duration),
        description: sanitizeText(formData.description),
        videoUrl: formData.videoUrl,
        order,
        status: formData.status
      }

      if (editingId) {
        await updateLesson(editingId, sanitizedData)
      } else {
        await addLesson(sanitizedData)
      }

      resetForm()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteLesson(id)
      setDeleteConfirm(null)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const renderLessonItem = (item, index) => (
    <div className="flex-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
            {item.videoUrl ? (
              <Play className="w-4 h-4 text-gold" />
            ) : (
              <Video className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">{index + 1}.</span>
              <h3 className="font-medium">{item.title}</h3>
              <StatusToggle
                status={item.status}
                onChange={async (status) => {
                  setSaveError(null)
                  try {
                    await updateLesson(item.id, { status })
                  } catch (err) {
                    setSaveError(err.message)
                  }
                }}
                size="small"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.duration}
              </span>
              {!item.videoUrl && (
                <span className="text-yellow-400">No video uploaded</span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-gray-400 line-clamp-1 mt-1">{item.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleEdit(item)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteConfirm(item.id)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // Show error for invalid module ID
  if (!isValidModuleId) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-2">Invalid Module ID</h2>
        <p className="text-gray-400 mb-4">The module ID in the URL is invalid.</p>
        <Link to="/admin/modules" className="text-gold hover:text-gold-dark">
          &larr; Back to Modules
        </Link>
      </div>
    )
  }

  if (loading || moduleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Back link */}
        <Link
          to="/admin/modules"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Modules
        </Link>

        {/* Module Info Card */}
        <div className="bg-dark-tertiary border border-white/5 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Module Number Badge */}
              <div className="w-14 h-14 bg-gold/10 border border-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-gold font-bold text-xl">{module?.number || '—'}</span>
              </div>
              {/* Module Details */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold">{module?.title || 'Lessons'}</h1>
                  {module && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      module.status === 'published'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {module.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  )}
                </div>
                {module?.shortDescription ? (
                  <p className="text-gray-400 text-sm mb-2">{module.shortDescription}</p>
                ) : (
                  <p className="text-gray-400 text-sm mb-2">Manage lessons for this module. Drag to reorder.</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                  {module?.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {module.duration}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-3">
              {lessons.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  Preview as User
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Lesson
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error display */}
        {(error || saveError) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error || saveError}</span>
          </div>
        )}

        {/* Edit/Add Form */}
        {isEditing && (
          <div className="bg-dark-tertiary border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">
                {editingId ? 'Edit Lesson' : 'New Lesson'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Title" htmlFor="title" required error={formErrors.title}>
                <TextInput
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Lesson title"
                  error={!!formErrors.title}
                />
              </FormField>

              <FormField label="Duration" htmlFor="duration" required error={formErrors.duration}>
                <TextInput
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="e.g., 4:32"
                  icon={Clock}
                  error={!!formErrors.duration}
                />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="description" hint="Optional lesson description">
              <TextArea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What will students learn in this lesson?"
                rows={3}
                maxLength={1000}
                showCount
              />
            </FormField>

            <FormField label="Video" htmlFor="video">
              <VideoUploader
                value={formData.videoUrl}
                onChange={(url) => handleChange('videoUrl', url)}
                path={`videos/modules/${moduleId}`}
              />
            </FormField>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <StatusToggle
                status={formData.status}
                onChange={(status) => handleChange('status', status)}
              />
              <SaveButton
                onClick={handleSave}
                loading={saving}
              >
                {editingId ? 'Update Lesson' : 'Add Lesson'}
              </SaveButton>
            </div>
          </div>
        )}

        {/* Lessons List */}
        <DragDropList
          items={lessons}
          onReorder={reorderLessons}
          onReorderError={(err) => setSaveError(err.message)}
          renderItem={renderLessonItem}
          keyExtractor={(item) => item.id}
          disabled={saving}
        />

        {lessons.length === 0 && !isEditing && (
          <div className="text-center py-12 bg-dark-tertiary border border-white/5 rounded-xl">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No lessons yet</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gold hover:text-gold-dark transition-colors"
            >
              Add your first lesson
            </button>
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
              <h3 id="delete-modal-title" className="font-semibold mb-2">Delete Lesson?</h3>
              <p className="text-sm text-gray-400 mb-6">
                This will also delete the associated video. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview as User"
      >
        <LessonPreview
          module={module}
          lessons={lessons.filter(l => l.status === 'published')}
        />
      </PreviewModal>
    </div>
  )
}
