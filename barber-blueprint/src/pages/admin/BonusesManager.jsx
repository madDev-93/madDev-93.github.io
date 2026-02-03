import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useBonuses } from '../../hooks/useBonuses'
import * as LucideIcons from 'lucide-react'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import TextArea from '../../components/admin/shared/TextArea'
import SaveButton from '../../components/admin/shared/SaveButton'
import StatusToggle from '../../components/admin/shared/StatusToggle'
import DragDropList from '../../components/admin/shared/DragDropList'
import IconPicker from '../../components/admin/shared/IconPicker'
import PDFUploader from '../../components/admin/shared/PDFUploader'
import { sanitizeText } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, Edit2, X, Gift } from 'lucide-react'

const BONUS_TYPES = ['PDF', 'Video', 'Template']

export default function BonusesManager() {
  const {
    bonuses,
    loading,
    error,
    saving,
    addBonus,
    updateBonus,
    deleteBonus,
    reorderBonuses
  } = useBonuses(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    icon: 'FileText',
    title: '',
    description: '',
    type: 'PDF',
    fileUrl: '',
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
    setFormData({
      icon: 'FileText',
      title: '',
      description: '',
      type: 'PDF',
      fileUrl: '',
      order: bonuses.length + 1,
      status: 'draft'
    })
    setFormErrors({})
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (item) => {
    setFormData({
      icon: item.icon || 'FileText',
      title: item.title || '',
      description: item.description || '',
      type: item.type || 'PDF',
      fileUrl: item.fileUrl || '',
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
      description: [validators.required, validators.maxLength(500)]
    }
    const errors = validateForm(formData, schema)
    setFormErrors(errors || {})
    return !errors
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaveError(null)

    const order = Number(formData.order)
    if (isNaN(order) || order < 0) {
      setSaveError('Order must be a valid positive number')
      return
    }

    try {
      const sanitizedData = {
        icon: formData.icon,
        title: sanitizeText(formData.title),
        description: sanitizeText(formData.description),
        type: formData.type,
        fileUrl: formData.fileUrl,
        order,
        status: formData.status
      }

      if (editingId) {
        await updateBonus(editingId, sanitizedData)
      } else {
        await addBonus(sanitizedData)
      }

      resetForm()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteBonus(id)
      setDeleteConfirm(null)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const renderBonusItem = (item) => {
    const Icon = LucideIcons[item.icon] || Gift
    return (
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{item.title}</h3>
                <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded">
                  {item.type}
                </span>
                <StatusToggle
                  status={item.status}
                  onChange={async (status) => {
                    setSaveError(null)
                    try {
                      await updateBonus(item.id, { status })
                    } catch (err) {
                      setSaveError(err.message)
                    }
                  }}
                  size="small"
                />
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
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
            <h1 className="text-2xl font-bold">Bonuses</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage bonus materials. Drag to reorder.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Bonus
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
                {editingId ? 'Edit Bonus' : 'New Bonus'}
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
              <FormField label="Icon" htmlFor="icon">
                <IconPicker
                  value={formData.icon}
                  onChange={(icon) => handleChange('icon', icon)}
                />
              </FormField>

              <FormField label="Type" htmlFor="type">
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50"
                >
                  {BONUS_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Title" htmlFor="title" required error={formErrors.title}>
              <TextInput
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Bonus title"
                error={!!formErrors.title}
              />
            </FormField>

            <FormField label="Description" htmlFor="description" required error={formErrors.description}>
              <TextArea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of the bonus"
                rows={3}
                maxLength={500}
                showCount
                error={!!formErrors.description}
              />
            </FormField>

            {formData.type === 'PDF' && (
              <FormField label="PDF File" htmlFor="fileUrl">
                <PDFUploader
                  value={formData.fileUrl}
                  onChange={(url) => handleChange('fileUrl', url)}
                  path="pdfs/bonuses"
                />
              </FormField>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <StatusToggle
                status={formData.status}
                onChange={(status) => handleChange('status', status)}
              />
              <SaveButton
                onClick={handleSave}
                loading={saving}
              >
                {editingId ? 'Update Bonus' : 'Add Bonus'}
              </SaveButton>
            </div>
          </div>
        )}

        {/* Bonuses List */}
        <DragDropList
          items={bonuses}
          onReorder={reorderBonuses}
          onReorderError={(err) => setSaveError(err.message)}
          renderItem={renderBonusItem}
          keyExtractor={(item) => item.id}
          disabled={saving}
        />

        {bonuses.length === 0 && !isEditing && (
          <div className="text-center py-12 bg-dark-tertiary border border-white/5 rounded-xl">
            <p className="text-gray-500 mb-4">No bonuses yet</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gold hover:text-gold-dark transition-colors"
            >
              Add your first bonus
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
              <h3 id="delete-modal-title" className="font-semibold mb-2">Delete Bonus?</h3>
              <p className="text-sm text-gray-400 mb-6">
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
