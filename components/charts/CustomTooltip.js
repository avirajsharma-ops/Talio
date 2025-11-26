'use client'

/**
 * Custom Tooltip Component for Recharts
 * Provides consistent, responsive, and well-styled tooltips across all charts
 */
export default function CustomTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Tooltip Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      </div>
      
      {/* Tooltip Content */}
      <div className="px-3 py-2 space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 min-w-[120px]">
            {/* Label with color indicator */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs sm:text-sm text-gray-600 truncate">
                {entry.name || entry.dataKey}
              </span>
            </div>
            
            {/* Value */}
            <span className="text-xs sm:text-sm font-semibold text-gray-900 flex-shrink-0">
              {valueFormatter ? valueFormatter(entry.value, entry) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Custom Tooltip for Pie Charts
 */
export function CustomPieTooltip({ active, payload, valueFormatter }) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0]

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[140px]">
      {/* Tooltip Header */}
      <div 
        className="px-3 py-2 border-b border-gray-200"
        style={{ backgroundColor: data.payload.color || data.color }}
      >
        <p className="text-xs sm:text-sm font-semibold text-white truncate">
          {data.name}
        </p>
      </div>
      
      {/* Tooltip Content */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-gray-600">
            Value:
          </span>
          <span className="text-xs sm:text-sm font-semibold text-gray-900">
            {valueFormatter ? valueFormatter(data.value) : data.value}
          </span>
        </div>
        {data.payload.percent !== undefined && (
          <div className="flex items-center justify-between gap-3 mt-1">
            <span className="text-xs sm:text-sm text-gray-600">
              Percentage:
            </span>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              {(data.payload.percent * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

