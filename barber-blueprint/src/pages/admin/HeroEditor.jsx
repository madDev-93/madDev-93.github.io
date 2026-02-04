import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSiteContent, savePreviewData } from '../../hooks/useSiteContent'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import TextArea from '../../components/admin/shared/TextArea'
import SaveButton from '../../components/admin/shared/SaveButton'
import PreviewModal from '../../components/admin/shared/PreviewModal'
import HeroPreview from '../../components/admin/previews/HeroPreview'
import { sanitizeText } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, RotateCcw, Eye } from 'lucide-react'

export default function HeroEditor() {
  const { content, loading, error: loadError, saving, saveSection } = useSiteContent('landing')

  const [formData, setFormData] = useState({
    badge: '',
    headline: '',
    subheadline: '',
    ctaText: '',
    stats: []
  })
  const [originalData, setOriginalData] = useState(null) // Track original for reset
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const savedTimerRef = useRef(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  // Load content into form
  useEffect(() => {
    if (content?.hero) {
      const loadedData = {
        badge: content.hero.badge || '',
        headline: content.hero.headline || '',
        subheadline: content.hero.subheadline || '',
        ctaText: content.hero.ctaText || '',
        stats: content.hero.stats || []
      }
      setFormData(loadedData)
      setOriginalData(loadedData) // Store original for reset
    }
  }, [content])

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!originalData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Reset to last saved version
  const handleReset = () => {
    if (originalData) {
      setFormData(originalData)
      setErrors({})
      setSaveError(null)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
    setSaved(false)
  }

  const handleStatChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      stats: prev.stats.map((stat, i) =>
        i === index ? { ...stat, [field]: value } : stat
      )
    }))
    setSaved(false)
  }

  const addStat = () => {
    if (formData.stats.length >= 4) return
    setFormData(prev => ({
      ...prev,
      stats: [...prev.stats, { value: '', label: '' }]
    }))
    setSaved(false)
  }

  const removeStat = (index) => {
    setFormData(prev => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index)
    }))
    setSaved(false)
  }

  const validate = () => {
    const schema = {
      headline: [validators.required, validators.maxLength(200)],
      subheadline: [validators.required, validators.maxLength(500)],
      ctaText: [validators.required, validators.maxLength(50)]
    }
    const formErrors = validateForm(formData, schema)
    setErrors(formErrors || {})
    return !formErrors
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaveError(null)

    try {
      const sanitizedData = {
        badge: sanitizeText(formData.badge),
        headline: sanitizeText(formData.headline),
        subheadline: sanitizeText(formData.subheadline),
        ctaText: sanitizeText(formData.ctaText),
        stats: formData.stats.map(stat => ({
          value: sanitizeText(stat.value),
          label: sanitizeText(stat.label)
        }))
      }

      await saveSection('hero', sanitizedData, 'published')
      setOriginalData(formData) // Update original after successful save
      setShowPreview(false) // Close preview modal on success
      setSaved(true)
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  const handlePreview = () => {
    // Desktop: show modal, Mobile: open new tab
    if (window.innerWidth >= 768) {
      setShowPreview(true)
    } else {
      savePreviewData('landing', 'hero', formData)
      window.open('/?preview=true', '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hero Section</h1>
            <p className="text-gray-400 text-sm mt-1">
              Edit the main hero section on the landing page
            </p>
          </div>
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            Preview Changes
          </button>
        </div>

        {/* Error display */}
        {(loadError || saveError) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{loadError || saveError}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-dark-tertiary border border-white/5 rounded-xl p-6 space-y-6">
          <FormField
            label="Badge Text"
            htmlFor="badge"
            hint="Short text above the headline (optional)"
          >
            <TextInput
              id="badge"
              value={formData.badge}
              onChange={(e) => handleChange('badge', e.target.value)}
              placeholder="e.g., Turn Views into Revenue"
              maxLength={50}
            />
          </FormField>

          <FormField
            label="Headline"
            htmlFor="headline"
            required
            error={errors.headline}
          >
            <TextArea
              id="headline"
              value={formData.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="Main headline text"
              rows={2}
              maxLength={200}
              showCount
              error={!!errors.headline}
            />
          </FormField>

          <FormField
            label="Subheadline"
            htmlFor="subheadline"
            required
            error={errors.subheadline}
          >
            <TextArea
              id="subheadline"
              value={formData.subheadline}
              onChange={(e) => handleChange('subheadline', e.target.value)}
              placeholder="Supporting text below the headline"
              rows={3}
              maxLength={500}
              showCount
              error={!!errors.subheadline}
            />
          </FormField>

          <FormField
            label="CTA Button Text"
            htmlFor="ctaText"
            required
            error={errors.ctaText}
          >
            <TextInput
              id="ctaText"
              value={formData.ctaText}
              onChange={(e) => handleChange('ctaText', e.target.value)}
              placeholder="e.g., Get Instant Access — $47"
              maxLength={50}
              error={!!errors.ctaText}
            />
          </FormField>

          {/* Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Stats (max 4)
              </label>
              {formData.stats.length < 4 && (
                <button
                  type="button"
                  onClick={addStat}
                  className="text-sm text-gold hover:text-gold-dark flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Stat
                </button>
              )}
            </div>

            <div className="space-y-3">
              {formData.stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <TextInput
                      value={stat.value}
                      onChange={(e) => handleStatChange(index, 'value', e.target.value)}
                      placeholder="Value (e.g., 6)"
                    />
                    <TextInput
                      value={stat.label}
                      onChange={(e) => handleStatChange(index, 'label', e.target.value)}
                      placeholder="Label (e.g., Core Modules)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStat(index)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Remove stat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {formData.stats.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No stats added yet. Click "Add Stat" to add one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {saved && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">
              <strong>Saved!</strong> Your changes are now live on the public site.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleReset}
            disabled={saving || !hasChanges}
            className="px-6 py-2.5 text-sm font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <SaveButton
            onClick={handleSave}
            loading={saving}
            saved={saved}
            disabled={!hasChanges}
          >
            Save Changes
          </SaveButton>
        </div>
      </motion.div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Hero Section"
        onSave={handleSave}
        saving={saving}
        hasChanges={hasChanges}
      >
        <HeroPreview data={formData} />
      </PreviewModal>
    </div>
  )
}
