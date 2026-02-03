import { Eye, EyeOff } from 'lucide-react'

export default function StatusToggle({
  status,
  onChange,
  disabled = false,
  size = 'default'
}) {
  const isPublished = status === 'published'

  const sizeClasses = {
    small: 'px-2.5 py-1 text-xs gap-1.5',
    default: 'px-3 py-1.5 text-sm gap-2',
    large: 'px-4 py-2 text-sm gap-2'
  }

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-4 h-4'
  }

  return (
    <button
      type="button"
      onClick={() => onChange(isPublished ? 'draft' : 'published')}
      disabled={disabled}
      className={`inline-flex items-center rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${
        isPublished
          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
          : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20'
      }`}
      aria-pressed={isPublished}
    >
      {isPublished ? (
        <>
          <Eye className={iconSizes[size]} aria-hidden="true" />
          Published
        </>
      ) : (
        <>
          <EyeOff className={iconSizes[size]} aria-hidden="true" />
          Draft
        </>
      )}
    </button>
  )
}
