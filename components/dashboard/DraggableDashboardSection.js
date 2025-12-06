'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FaGripVertical } from 'react-icons/fa'

export default function DraggableDashboardSection({
    id,
    children,
    className = '',
    style = {},
    hideHandle = false
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const combinedStyle = {
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.9 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={combinedStyle}
            className={`relative group ${className} ${isDragging ? 'ring-2 ring-primary-500 shadow-xl' : ''}`}
        >
            {/* Drag Handle */}
            {!hideHandle && (
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-2 right-2 z-10 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-black/10 bg-white/80 shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <FaGripVertical className="w-4 h-4 text-gray-500" />
                </div>
            )}
            {children}
        </div>
    )
}
