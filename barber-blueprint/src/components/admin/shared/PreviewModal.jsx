import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Monitor, Check, Loader2 } from 'lucide-react'

export default function PreviewModal({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saving = false,
  hasChanges = true
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-dark-secondary border border-white/10 rounded-t-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">Preview: {title}</span>
              </div>
              <div className="flex items-center gap-2">
                {onSave && (
                  <button
                    onClick={onSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-4 py-1.5 bg-gold hover:bg-gold-dark text-dark text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 bg-dark overflow-auto rounded-b-xl border border-t-0 border-white/10">
              <div className="min-h-full">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
