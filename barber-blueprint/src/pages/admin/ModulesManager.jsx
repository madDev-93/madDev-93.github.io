import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useModules } from '../../hooks/useModules'
import * as LucideIcons from 'lucide-react'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import TextArea from '../../components/admin/shared/TextArea'
import NumberInput from '../../components/admin/shared/NumberInput'
import SaveButton from '../../components/admin/shared/SaveButton'
import StatusToggle from '../../components/admin/shared/StatusToggle'
import DragDropList from '../../components/admin/shared/DragDropList'
import IconPicker from '../../components/admin/shared/IconPicker'
import { sanitizeText } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, Edit2, X, BookOpen, ChevronRight, Clock, ListVideo } from 'lucide-react'

export default function ModulesManager() {
  const {
    modules,
    loading,
    error,
    saving,
    addModule,
    updateModule,
    deleteModule,
    reorderModules
  } = useModules(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    number: '01',
    icon: 'BookOpen',
    title: '',
    shortDescription: '',
    fullDescription: '',
    duration: '',
    order: 1,
    status: 'draft'
  })
  const [formErrors, setFormErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  const resetForm = () => {
    const nextOrder = modules.length + 1
    setFormData({
      number: String(nextOrder).padStart(2, '0'),
      icon: 'BookOpen',
      title: '',
      shortDescription: '',
      fullDescription: '',
      duration: '',
      order: nextOrder,
      status: 'draft'
    })
    setFormErrors({})
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (item) => {
    setFormData({
      number: item.number || '01',
      icon: item.icon || 'BookOpen',
      title: item.title || '',
      shortDescription: item.shortDescription || '',
      fullDescription: item.fullDescription || '',
      duration: item.duration || '',
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
      shortDescription: [validators.required, validators.maxLength(300)]
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
        number: formData.number,
        icon: formData.icon,
        title: sanitizeText(formData.title),
        shortDescription: sanitizeText(formData.shortDescription),
        fullDescription: sanitizeText(formData.fullDescription),
        duration: sanitizeText(formData.duration),
        order,
        status: formData.status
      }

      if (editingId) {
        await updateModule(editingId, sanitizedData)
      } else {
        await addModule(sanitizedData)
      }

      resetForm()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteModule(id)
      setDeleteConfirm(null)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const renderModuleItem = (item) => {
    const Icon = LucideIcons[item.icon] || BookOpen
    return (
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold text-sm">{item.number}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gold" />
                <h3 className="font-medium">{item.title}</h3>
                <StatusToggle
                  status={item.status}
                  onChange={async (status) => {
                    setSaveError(null)
                    try {
                      await updateModule(item.id, { status })
                    } catch (err) {
                      setSaveError(err.message)
                    }
                  }}
                  size="small"
                />
              </div>
              <p className="text-sm text-gray-400 line-clamp-1 mb-2">{item.shortDescription}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {item.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.duration}
                  </span>
                )}
                <Link
                  to={`/admin/modules/${item.id}/lessons`}
                  className="flex items-center gap-1 text-gold hover:text-gold-dark transition-colors"
                >
                  <ListVideo className="w-3 h-3" />
                  Manage Lessons
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
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
  }

  if (loading) {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Course Modules</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage course modules. Drag to reorder. Click "Manage Lessons" to add content.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Module
            </button>
          )}
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
                {editingId ? 'Edit Module' : 'New Module'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Module Number" htmlFor="number">
                <TextInput
                  id="number"
                  value={formData.number}
                  onChange={(e) => handleChange('number', e.target.value)}
                  placeholder="01"
                  maxLength={2}
                />
              </FormField>

              <FormField label="Icon" htmlFor="icon">
                <IconPicker
                  value={formData.icon}
                  onChange={(icon) => handleChange('icon', icon)}
                />
              </FormField>

              <FormField label="Duration" htmlFor="duration">
                <TextInput
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="e.g., 18 min"
                  icon={Clock}
                />
              </FormField>
            </div>

            <FormField label="Title" htmlFor="title" required error={formErrors.title}>
              <TextInput
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Module title"
                error={!!formErrors.title}
              />
            </FormField>

            <FormField label="Short Description" htmlFor="shortDescription" required error={formErrors.shortDescription}>
              <TextInput
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => handleChange('shortDescription', e.target.value)}
                placeholder="Brief description for module cards"
                error={!!formErrors.shortDescription}
              />
            </FormField>

            <FormField label="Full Description" htmlFor="fullDescription">
              <TextArea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => handleChange('fullDescription', e.target.value)}
                placeholder="Detailed description shown on module page"
                rows={3}
                maxLength={1000}
                showCount
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
                {editingId ? 'Update Module' : 'Add Module'}
              </SaveButton>
            </div>
          </div>
        )}

        {/* Modules List */}
        <DragDropList
          items={modules}
          onReorder={reorderModules}
          onReorderError={(err) => setSaveError(err.message)}
          renderItem={renderModuleItem}
          keyExtractor={(item) => item.id}
          disabled={saving}
        />

        {modules.length === 0 && !isEditing && (
          <div className="text-center py-12 bg-dark-tertiary border border-white/5 rounded-xl">
            <p className="text-gray-500 mb-4">No modules yet</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gold hover:text-gold-dark transition-colors"
            >
              Add your first module
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
              <h3 id="delete-modal-title" className="font-semibold mb-2">Delete Module?</h3>
              <p className="text-sm text-gray-400 mb-2">
                This will also delete all lessons within this module.
              </p>
              <p className="text-sm text-red-400 mb-6">
                This action cannot be undone.
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
    </div>
  )
}
