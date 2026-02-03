import { forwardRef } from 'react'
import { Minus, Plus } from 'lucide-react'

const NumberInput = forwardRef(function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  error = false,
  showControls = true,
  prefix,
  suffix,
  className = '',
  ...props
}, ref) {
  const handleIncrement = () => {
    const newValue = (Number(value) || 0) + step
    if (max === undefined || newValue <= max) {
      onChange({ target: { value: newValue } })
    }
  }

  const handleDecrement = () => {
    const newValue = (Number(value) || 0) - step
    if (min === undefined || newValue >= min) {
      onChange({ target: { value: newValue } })
    }
  }

  // Validate direct input to enforce min/max bounds
  const handleChange = (e) => {
    const inputValue = e.target.value

    // Allow empty input for typing
    if (inputValue === '' || inputValue === '-') {
      onChange(e)
      return
    }

    const numValue = Number(inputValue)
    if (isNaN(numValue)) return

    // Clamp to bounds
    let clampedValue = numValue
    if (min !== undefined && numValue < min) {
      clampedValue = min
    }
    if (max !== undefined && numValue > max) {
      clampedValue = max
    }

    onChange({ target: { value: clampedValue } })
  }

  return (
    <div className="relative flex items-center">
      {showControls && (
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && Number(value) <= min)}
          className="p-2 bg-white/5 border border-white/10 border-r-0 rounded-l-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease"
        >
          <Minus className="w-4 h-4" />
        </button>
      )}
      <div className="relative flex-1">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`w-full bg-white/5 border px-4 py-2.5 text-white text-sm text-center placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            showControls ? 'border-x-0 rounded-none' : 'rounded-lg'
          } ${
            prefix ? 'pl-8' : ''
          } ${
            suffix ? 'pr-8' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-white/10 focus:border-gold/50'
          } ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {showControls && (
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && Number(value) >= max)}
          className="p-2 bg-white/5 border border-white/10 border-l-0 rounded-r-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  )
})

export default NumberInput
