'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FaGripVertical, FaTimes, FaCog, FaExpand, FaCompress } from 'react-icons/fa'
import { useState } from 'react'

export default function DraggableWidget({
  id,
  title,
  children,
  onRemove,
  className = '',
  style = {},
  removable = true,
  collapsible = true,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showControls, setShowControls] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    ...style,
  }

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`relative group ${isDragging ? 'ring-2 ring-primary-500 shadow-xl' : ''} ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Widget Controls - appears on hover */}
      <div
        className={`absolute top-2 right-2 flex items-center gap-1 z-10 transition-opacity duration-200 ${showControls || isDragging ? 'opacity-100' : 'opacity-0'
          }`}
      >
        {/* Collapse/Expand Button */}
        {collapsible && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsCollapsed(!isCollapsed)
            }}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            title={isCollapsed ? 'Expand widget' : 'Collapse widget'}
          >
            {isCollapsed ? (
              <FaExpand className="w-3 h-3 text-gray-500" />
            ) : (
              <FaCompress className="w-3 h-3 text-gray-500" />
            )}
          </button>
        )}

        {/* Remove Button */}
        {removable && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(id)
            }}
            className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 transition-colors"
            title="Remove widget"
          >
            <FaTimes className="w-3 h-3 text-red-500" />
          </button>
        )}

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder"
        >
          <FaGripVertical className="w-3 h-3 text-gray-500" />
        </div>
      </div>

      {/* Widget Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'max-h-14 overflow-hidden' : ''}`}>
        {/* Title bar when collapsed */}
        {isCollapsed && title && (
          <div className="p-4 flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">{title}</span>
            <span className="text-xs text-gray-400">(collapsed)</span>
          </div>
        )}

        {/* Actual content */}
        <div className={isCollapsed ? 'hidden' : ''}>
          {children}
        </div>
      </div>
    </div>
  )
}
