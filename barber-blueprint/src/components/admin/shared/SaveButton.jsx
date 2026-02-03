import { Check, Loader2 } from 'lucide-react'

export default function SaveButton({
  onClick,
  loading = false,
  disabled = false,
  saved = false,
  children = 'Save Changes',
  savedText = 'Saved!',
  variant = 'default', // 'default' | 'publish'
  className = ''
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark'

  const variantStyles = {
    default: saved
      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
      : 'bg-gold hover:bg-gold-dark text-dark focus:ring-gold/50',
    publish: saved
      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
      : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500/50'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading || saved}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {variant === 'publish' ? 'Publishing...' : 'Saving...'}
        </>
      ) : saved ? (
        <>
          <Check className="w-4 h-4" />
          {variant === 'publish' ? 'Published!' : savedText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
