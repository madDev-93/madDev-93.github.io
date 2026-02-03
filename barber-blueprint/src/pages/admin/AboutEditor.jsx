import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSiteContent, savePreviewData } from '../../hooks/useSiteContent'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import TextArea from '../../components/admin/shared/TextArea'
import SaveButton from '../../components/admin/shared/SaveButton'
import PreviewModal from '../../components/admin/shared/PreviewModal'
import AboutPreview from '../../components/admin/previews/AboutPreview'
import { sanitizeText, sanitizeInstagramHandle } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, RotateCcw, Instagram, Eye } from 'lucide-react'

export default function AboutEditor() {
  const { content, loading, error: loadError, saving, saveSection } = useSiteContent('landing')

  const [formData, setFormData] = useState({
    headline: '',
    paragraphs: [],
    quote: { text: '', attribution: '' },
    instagram: ''
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
    if (content?.about) {
      const loadedData = {
        headline: content.about.headline || '',
        paragraphs: content.about.paragraphs || [],
        quote: content.about.quote || { text: '', attribution: '' },
        instagram: content.about.instagram || ''
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

  const handleQuoteChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      quote: { ...prev.quote, [field]: value }
    }))
    setSaved(false)
  }

  const handleParagraphChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map((p, i) => i === index ? value : p)
    }))
    setSaved(false)
  }

  const addParagraph = () => {
    if (formData.paragraphs.length >= 5) return
    setFormData(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, '']
    }))
    setSaved(false)
  }

  const removeParagraph = (index) => {
    setFormData(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, i) => i !== index)
    }))
    setSaved(false)
  }

  const validate = () => {
    const schema = {
      headline: [validators.required, validators.maxLength(200)]
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
        headline: sanitizeText(formData.headline),
        paragraphs: formData.paragraphs.map(p => sanitizeText(p)).filter(p => p),
        quote: {
          text: sanitizeText(formData.quote.text),
          attribution: sanitizeText(formData.quote.attribution)
        },
        instagram: sanitizeInstagramHandle(formData.instagram)
      }

      await saveSection('about', sanitizedData, 'published')
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
      savePreviewData('landing', 'about', formData)
      window.open('/?preview=true#about', '_blank')
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
        <div>
          <h1 className="text-2xl font-bold">About Section</h1>
          <p className="text-gray-400 text-sm mt-1">
            Edit the about/story section on the landing page
          </p>
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
            label="Section Headline"
            htmlFor="headline"
            required
            error={errors.headline}
          >
            <TextInput
              id="headline"
              value={formData.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="e.g., From Chair Renter to Content Creator"
              maxLength={200}
              error={!!errors.headline}
            />
          </FormField>

          {/* Paragraphs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Story Paragraphs (max 5)
              </label>
              {formData.paragraphs.length < 5 && (
                <button
                  type="button"
                  onClick={addParagraph}
                  className="text-sm text-gold hover:text-gold-dark flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Paragraph
                </button>
              )}
            </div>

            <div className="space-y-3">
              {formData.paragraphs.map((paragraph, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 pt-3 w-4">{index + 1}.</span>
                  <div className="flex-1">
                    <TextArea
                      value={paragraph}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      placeholder="Enter paragraph text..."
                      rows={2}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeParagraph(index)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors mt-1"
                    aria-label="Remove paragraph"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {formData.paragraphs.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No paragraphs added yet. Click "Add Paragraph" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Quote */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-gray-300">Featured Quote</h3>

            <FormField
              label="Quote Text"
              htmlFor="quoteText"
            >
              <TextArea
                id="quoteText"
                value={formData.quote.text}
                onChange={(e) => handleQuoteChange('text', e.target.value)}
                placeholder="Enter an impactful quote..."
                rows={2}
              />
            </FormField>

            <FormField
              label="Attribution"
              htmlFor="quoteAttribution"
            >
              <TextInput
                id="quoteAttribution"
                value={formData.quote.attribution}
                onChange={(e) => handleQuoteChange('attribution', e.target.value)}
                placeholder="e.g., Your instructor"
              />
            </FormField>
          </div>

          {/* Instagram */}
          <div className="pt-4 border-t border-white/5">
            <FormField
              label="Instagram Handle"
              htmlFor="instagram"
              hint="Your Instagram username (without @)"
            >
              <TextInput
                id="instagram"
                value={formData.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="barberblueprint"
                icon={Instagram}
              />
            </FormField>
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
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePreview}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Changes
          </button>
          <div className="flex items-center gap-3">
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
        </div>
      </motion.div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="About Section"
        onSave={handleSave}
        saving={saving}
        hasChanges={hasChanges}
      >
        <AboutPreview data={formData} />
      </PreviewModal>
    </div>
  )
}
