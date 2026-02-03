import { forwardRef } from 'react'

const TextArea = forwardRef(function TextArea({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  rows = 4,
  maxLength,
  showCount = false,
  className = '',
  ...props
}, ref) {
  const charCount = value?.length || 0

  return (
    <div className="relative">
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-white/10 focus:border-gold/50'
        } ${className}`}
        {...props}
      />
      {showCount && maxLength && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          {charCount}/{maxLength}
        </div>
      )}
    </div>
  )
})

export default TextArea
