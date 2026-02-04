import { forwardRef } from 'react'

const TextInput = forwardRef(function TextInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  icon: Icon,
  className = '',
  ...props
}, ref) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          aria-hidden="true"
        />
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full h-[42px] bg-white/5 border rounded-lg px-4 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          Icon ? 'pl-10' : ''
        } ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-white/10 focus:border-gold/50'
        } ${className}`}
        {...props}
      />
    </div>
  )
})

export default TextInput
