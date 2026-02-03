import { useState, useRef } from 'react'
import { GripVertical } from 'lucide-react'

export default function DragDropList({
  items,
  onReorder,
  onReorderError,
  renderItem,
  keyExtractor,
  disabled = false
}) {
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isReordering, setIsReordering] = useState(false)
  // Lock to prevent concurrent reorders (ref for synchronous check)
  const isReorderingRef = useRef(false)

  const handleDragStart = (e, index) => {
    if (disabled || isReordering) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
    // Add a slight delay to show drag effect
    setTimeout(() => {
      e.target.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50')
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (disabled || draggedIndex === null) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    if (disabled || draggedIndex === null || draggedIndex === dropIndex) return
    if (!items || !Array.isArray(items) || items.length === 0) return
    // Prevent concurrent reorders
    if (isReorderingRef.current) return

    isReorderingRef.current = true
    setIsReordering(true)

    const newItems = [...items]
    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(dropIndex, 0, draggedItem)

    // Update order numbers
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }))

    setDraggedIndex(null)
    setDragOverIndex(null)

    try {
      await onReorder?.(reorderedItems)
    } catch (err) {
      console.error('Error reordering items:', err)
      // Propagate error to parent component
      onReorderError?.(err)
    } finally {
      isReorderingRef.current = false
      setIsReordering(false)
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return null
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item, index) => (
        <li
          key={keyExtractor(item)}
          draggable={!disabled && !isReordering}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`group flex items-start gap-3 bg-dark-tertiary border rounded-lg p-4 transition-all ${
            dragOverIndex === index && draggedIndex !== index
              ? 'border-gold bg-gold/5'
              : 'border-white/5 hover:border-white/10'
          } ${disabled || isReordering ? 'cursor-default opacity-75' : 'cursor-grab active:cursor-grabbing'}`}
        >
          {!disabled && (
            <div className="flex-shrink-0 pt-1 text-gray-500 group-hover:text-gray-400 transition-colors">
              <GripVertical className="w-4 h-4" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {renderItem(item, index)}
          </div>
        </li>
      ))}
    </ul>
  )
}
