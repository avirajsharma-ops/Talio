'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import DraggableWidget from './DraggableWidget'
import AddWidgetModal from './AddWidgetModal'
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets'
import { WIDGET_REGISTRY } from '@/lib/widgetRegistry'
import { FaPlus, FaUndo, FaCog, FaGripVertical } from 'react-icons/fa'

export default function CustomizableDashboard({
  userId,
  userRole = 'employee',
  widgetComponents,  // Object mapping widget IDs to their rendered components
  className = 'space-y-5',
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)

  const {
    enabledWidgets,
    widgetOrder,
    isInitialized,
    addWidget,
    removeWidget,
    handleDragEnd,
    resetToDefaults,
    getOrderedWidgets,
  } = useDashboardWidgets(userId, userRole)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEndWithReset = (event) => {
    handleDragEnd(event)
    setActiveId(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const handleAddWidget = (widget) => {
    addWidget(widget.id)
  }

  const handleRemoveWidget = (widgetId) => {
    removeWidget(widgetId)
  }

  // Get active widget for overlay
  const activeWidget = activeId ? WIDGET_REGISTRY[activeId] : null

  // Loading skeleton
  if (!isInitialized) {
    return (
      <div className={className}>
        <div className="flex justify-end mb-4 gap-2">
          <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 animate-pulse"
            style={{ backgroundColor: 'var(--color-bg-card)', minHeight: '150px' }}
          >
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  // Get ordered widgets that have components
  const orderedWidgets = getOrderedWidgets().filter(
    widget => widgetComponents[widget.id]
  )

  return (
    <div className="relative">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full font-medium">
              Edit Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${isEditMode
                ? 'bg-primary-500 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            title={isEditMode ? 'Exit edit mode' : 'Enter edit mode to customize'}
          >
            <FaCog className="w-3 h-3" />
            <span>{isEditMode ? 'Done Editing' : 'Customize'}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset to default layout"
          >
            <FaUndo className="w-3 h-3" />
            <span>Reset</span>
          </button>

          {/* Add Widget Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>Add Widget</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {orderedWidgets.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: 'var(--color-bg-card)' }}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FaPlus className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Your dashboard is empty
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Start customizing your dashboard by adding widgets. Choose from attendance, employees, leave management, and more!
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add Your First Widget
          </button>
        </div>
      )}

      {/* Draggable Widgets Grid */}
      {orderedWidgets.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndWithReset}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={orderedWidgets.map(w => w.id)}
            strategy={rectSortingStrategy}
          >
            <div className={className}>
              {orderedWidgets.map((widget) => {
                const WidgetContent = widgetComponents[widget.id]

                return (
                  <DraggableWidget
                    key={widget.id}
                    id={widget.id}
                    title={widget.name}
                    onRemove={isEditMode ? handleRemoveWidget : null}
                    removable={isEditMode}
                    collapsible={true}
                    className="rounded-2xl"
                    style={{ backgroundColor: 'var(--color-bg-card)' }}
                  >
                    {WidgetContent}
                  </DraggableWidget>
                )
              })}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay adjustScale={false}>
            {activeWidget ? (
              <div
                className="rounded-2xl shadow-2xl ring-2 ring-primary-500 opacity-95 overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  maxHeight: '300px',
                }}
              >
                <div className="p-4 flex items-center gap-2 bg-primary-50 border-b border-primary-100">
                  <FaGripVertical className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-primary-700">
                    {activeWidget.name}
                  </span>
                </div>
                <div className="p-4 opacity-50 blur-[1px]">
                  {widgetComponents[activeWidget.id]}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddWidget={handleAddWidget}
        enabledWidgets={enabledWidgets}
        userRole={userRole}
      />
    </div>
  )
}
