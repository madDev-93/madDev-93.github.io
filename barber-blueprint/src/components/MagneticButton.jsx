import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function MagneticButton({ children, className = '', href = '#', onClick }) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const x = (clientX - left - width / 2) * 0.3
    const y = (clientY - top - height / 2) * 0.3
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  // Reset position on focus for keyboard users
  const handleFocus = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={`focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark ${className}`}
    >
      {children}
    </motion.a>
  )
}
