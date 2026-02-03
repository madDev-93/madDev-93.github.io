import { Eye, RotateCcw, Loader2, Check } from 'lucide-react'

export default function EditorToolbar({
  title,
  subtitle,
  onPreview,
  onReset,
  onSave,
  saving = false,
  saved = false,
  hasChanges = false
}) {
  return (
    <div className="sticky top-0 z-20 bg-dark-secondary/95 backdrop-blur-sm border-b border-white/10 -mx-6 px-6 py-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-gray-400 text-sm mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={saving || !hasChanges}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !hasChanges}
              className="px-4 py-2 text-sm font-semibold bg-gold hover:bg-gold-dark text-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Saved!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && !saving && !saved && (
        <div className="mt-2 text-xs text-yellow-400/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          Unsaved changes
        </div>
      )}
    </div>
  )
}
