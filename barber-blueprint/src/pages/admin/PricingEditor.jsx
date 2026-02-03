import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSiteContent, savePreviewData } from '../../hooks/useSiteContent'
import FormField from '../../components/admin/shared/FormField'
import TextInput from '../../components/admin/shared/TextInput'
import NumberInput from '../../components/admin/shared/NumberInput'
import SaveButton from '../../components/admin/shared/SaveButton'
import PreviewModal from '../../components/admin/shared/PreviewModal'
import PricingPreview from '../../components/admin/previews/PricingPreview'
import { sanitizeText } from '../../utils/sanitize'
import { validators, validateForm } from '../../utils/validation'
import { AlertCircle, Plus, Trash2, RotateCcw, Eye } from 'lucide-react'

export default function PricingEditor() {
  const { content, loading, error: loadError, saving, saveSection } = useSiteContent('landing')

  const [formData, setFormData] = useState({
    currentPrice: 47,
    originalPrice: 97,
    discount: '50%',
    includedItems: []
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
    if (content?.pricing) {
      const loadedData = {
        currentPrice: content.pricing.currentPrice || 47,
        originalPrice: content.pricing.originalPrice || 97,
        discount: content.pricing.discount || '50%',
        includedItems: content.pricing.includedItems || []
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

  const handleItemChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      includedItems: prev.includedItems.map((item, i) => i === index ? value : item)
    }))
    setSaved(false)
  }

  const addItem = () => {
    if (formData.includedItems.length >= 10) return
    setFormData(prev => ({
      ...prev,
      includedItems: [...prev.includedItems, '']
    }))
    setSaved(false)
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      includedItems: prev.includedItems.filter((_, i) => i !== index)
    }))
    setSaved(false)
  }

  const validate = () => {
    const schema = {
      currentPrice: [validators.required, validators.positiveNumber, validators.range(0, 10000)],
      originalPrice: [validators.required, validators.positiveNumber, validators.range(0, 10000)]
    }
    const formErrors = validateForm(formData, schema)
    setErrors(formErrors || {})
    return !formErrors
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaveError(null)

    try {
      const currentPrice = Number(formData.currentPrice)
      const originalPrice = Number(formData.originalPrice)

      // Validate converted numbers are valid
      if (isNaN(currentPrice) || isNaN(originalPrice)) {
        setSaveError('Invalid price values. Please enter valid numbers.')
        return
      }

      const sanitizedData = {
        currentPrice,
        originalPrice,
        discount: sanitizeText(formData.discount),
        includedItems: formData.includedItems.map(item => sanitizeText(item)).filter(item => item)
      }

      await saveSection('pricing', sanitizedData, 'published')
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
      savePreviewData('landing', 'pricing', formData)
      window.open('/?preview=true#get-access', '_blank')
    }
  }

  // Calculate discount percentage
  const calculatedDiscount = formData.originalPrice > 0
    ? Math.round(((formData.originalPrice - formData.currentPrice) / formData.originalPrice) * 100)
    : 0

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
          <h1 className="text-2xl font-bold">Pricing Section</h1>
          <p className="text-gray-400 text-sm mt-1">
            Edit pricing and included items
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
          {/* Price preview */}
          <div className="bg-gold/5 border border-gold/20 rounded-lg p-6 text-center">
            <p className="text-gray-400 text-sm mb-2">Price Preview</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold text-gold">${formData.currentPrice}</span>
              {formData.originalPrice > formData.currentPrice && (
                <>
                  <span className="text-xl text-gray-500 line-through">${formData.originalPrice}</span>
                  <span className="text-sm text-green-400 bg-green-500/10 px-2 py-1 rounded">
                    {calculatedDiscount}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Current Price"
              htmlFor="currentPrice"
              required
              error={errors.currentPrice}
            >
              <NumberInput
                id="currentPrice"
                value={formData.currentPrice}
                onChange={(e) => handleChange('currentPrice', e.target.value)}
                min={0}
                max={10000}
                prefix="$"
                showControls={false}
                error={!!errors.currentPrice}
              />
            </FormField>

            <FormField
              label="Original Price"
              htmlFor="originalPrice"
              required
              error={errors.originalPrice}
              hint="Show as crossed out"
            >
              <NumberInput
                id="originalPrice"
                value={formData.originalPrice}
                onChange={(e) => handleChange('originalPrice', e.target.value)}
                min={0}
                max={10000}
                prefix="$"
                showControls={false}
                error={!!errors.originalPrice}
              />
            </FormField>
          </div>

          <FormField
            label="Discount Badge Text"
            htmlFor="discount"
            hint="Text to display on the discount badge (e.g., '50% OFF')"
          >
            <TextInput
              id="discount"
              value={formData.discount}
              onChange={(e) => handleChange('discount', e.target.value)}
              placeholder="e.g., 50%"
              maxLength={20}
            />
          </FormField>

          {/* Included items */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                What's Included (max 10)
              </label>
              {formData.includedItems.length < 10 && (
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-gold hover:text-gold-dark flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              )}
            </div>

            <div className="space-y-2">
              {formData.includedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <TextInput
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      placeholder="e.g., 6 Comprehensive Modules"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {formData.includedItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No items added yet. Click "Add Item" to add one.
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
        title="Pricing Section"
        onSave={handleSave}
        saving={saving}
        hasChanges={hasChanges}
      >
        <PricingPreview data={formData} />
      </PreviewModal>
    </div>
  )
}
