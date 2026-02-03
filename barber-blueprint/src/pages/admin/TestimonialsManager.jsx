import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTestimonials } from '../../hooks/useTestimonials'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import TextArea from '../../components/admin/shared/TextArea'
import NumberInput from '../../components/admin/shared/NumberInput'
import SaveButton from '../../components/admin/shared/SaveButton'
import StatusToggle from '../../components/admin/shared/StatusToggle'
import DragDropList from '../../components/admin/shared/DragDropList'
import { sanitizeText } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, Edit2, X, Star, MapPin } from 'lucide-react'

export default function TestimonialsManager() {
  const {
    testimonials,
    loading,
    error,
    saving,
    addTestimonial,
    updateTestimonial,
    deleteTestimonial,
    reorderTestimonials
  } = useTestimonials(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    rating: 5,
    text: '',
    highlight: '',
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
      name: '',
      location: '',
      rating: 5,
      text: '',
      highlight: '',
      order: testimonials.length + 1,
      status: 'draft'
    })
    setFormErrors({})
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (item) => {
    setFormData({
      name: item.name || '',
      location: item.location || '',
      rating: item.rating || 5,
      text: item.text || '',
      highlight: item.highlight || '',
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
      name: [validators.required, validators.maxLength(100)],
      text: [validators.required, validators.maxLength(1000)],
      rating: [validators.required, validators.rating]
    }
    const errors = validateForm(formData, schema)
    setFormErrors(errors || {})
    return !errors
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaveError(null)

    const rating = Number(formData.rating)
    const order = Number(formData.order)

    // Validate numeric conversions
    if (isNaN(rating) || rating < 1 || rating > 5) {
      setSaveError('Rating must be between 1 and 5')
      return
    }
    if (isNaN(order) || order < 0) {
      setSaveError('Order must be a valid positive number')
      return
    }

    try {
      const sanitizedData = {
        name: sanitizeText(formData.name),
        location: sanitizeText(formData.location),
        rating,
        text: sanitizeText(formData.text),
        highlight: sanitizeText(formData.highlight),
        order,
        status: formData.status
      }

      if (editingId) {
        await updateTestimonial(editingId, sanitizedData)
      } else {
        await addTestimonial(sanitizedData)
      }

      resetForm()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTestimonial(id)
      setDeleteConfirm(null)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const renderTestimonialItem = (item) => (
    <div className="flex-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{item.name}</h3>
            <StatusToggle
              status={item.status}
              onChange={async (status) => {
                setSaveError(null)
                try {
                  await updateTestimonial(item.id, { status })
                } catch (err) {
                  setSaveError(err.message)
                }
              }}
              size="small"
            />
          </div>
          {item.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3" />
              {item.location}
            </p>
          )}
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < item.rating ? 'text-gold fill-gold' : 'text-gray-600'}`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400 line-clamp-2">{item.text}</p>
          {item.highlight && (
            <p className="text-xs text-gold mt-1 italic">"{item.highlight}"</p>
          )}
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
            <h1 className="text-2xl font-bold">Testimonials</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage customer testimonials. Drag to reorder.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Testimonial
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
                {editingId ? 'Edit Testimonial' : 'New Testimonial'}
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
              <FormField label="Name" htmlFor="name" required error={formErrors.name}>
                <TextInput
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Customer name"
                  error={!!formErrors.name}
                />
              </FormField>

              <FormField label="Location" htmlFor="location">
                <TextInput
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="City, State"
                  icon={MapPin}
                />
              </FormField>
            </div>

            <FormField label="Rating" htmlFor="rating" required error={formErrors.rating}>
              <NumberInput
                id="rating"
                value={formData.rating}
                onChange={(e) => handleChange('rating', e.target.value)}
                min={1}
                max={5}
                error={!!formErrors.rating}
              />
            </FormField>

            <FormField label="Testimonial Text" htmlFor="text" required error={formErrors.text}>
              <TextArea
                id="text"
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder="What did the customer say?"
                rows={4}
                maxLength={1000}
                showCount
                error={!!formErrors.text}
              />
            </FormField>

            <FormField
              label="Highlight Quote"
              htmlFor="highlight"
              hint="Short pull quote to feature"
            >
              <TextInput
                id="highlight"
                value={formData.highlight}
                onChange={(e) => handleChange('highlight', e.target.value)}
                placeholder="e.g., Worth 10x what I paid"
                maxLength={200}
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
                {editingId ? 'Update Testimonial' : 'Add Testimonial'}
              </SaveButton>
            </div>
          </div>
        )}

        {/* Testimonials List */}
        <DragDropList
          items={testimonials}
          onReorder={reorderTestimonials}
          onReorderError={(err) => setSaveError(err.message)}
          renderItem={renderTestimonialItem}
          keyExtractor={(item) => item.id}
          disabled={saving}
        />

        {testimonials.length === 0 && !isEditing && (
          <div className="text-center py-12 bg-dark-tertiary border border-white/5 rounded-xl">
            <p className="text-gray-500 mb-4">No testimonials yet</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gold hover:text-gold-dark transition-colors"
            >
              Add your first testimonial
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
              <h3 id="delete-modal-title" className="font-semibold mb-2">Delete Testimonial?</h3>
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
