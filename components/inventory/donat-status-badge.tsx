import { cn } from "@/lib/utils"

export type DonatStatus = 'raw' | 'qc' | 'ready' | 'sold' | 'waste' | 'rejected' | 'otr'

interface DonatStatusBadgeProps {
  status: DonatStatus
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_CONFIG: Record<DonatStatus, {
  label: string
  color: string
  bgColor: string
  icon: string
  description: string
}> = {
  raw: {
    label: 'RAW',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
    icon: '🥖',
    description: 'Donat mentah (tanpa topping)'
  },
  qc: {
    label: 'QC',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
    icon: '🔍',
    description: 'Quality Check'
  },
  ready: {
    label: 'READY',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    icon: '✅',
    description: 'Siap jual (sudah topping)'
  },
  sold: {
    label: 'SOLD',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
    icon: '💰',
    description: 'Terjual'
  },
  waste: {
    label: 'WASTE',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    icon: '❌',
    description: 'Gagal produksi / Rusak'
  },
  rejected: {
    label: 'REJECTED',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-300',
    icon: '🚫',
    description: 'Batal beli'
  },
  otr: {
    label: 'OTR',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
    icon: '🚐',
    description: 'Di mobil OTR'
  }
}

const SIZE_CLASSES = {
  sm: {
    text: 'text-xs',
    padding: 'px-2 py-0.5',
    icon: 'text-sm'
  },
  md: {
    text: 'text-sm',
    padding: 'px-3 py-1',
    icon: 'text-base'
  },
  lg: {
    text: 'text-base',
    padding: 'px-4 py-1.5',
    icon: 'text-lg'
  }
}

export function DonatStatusBadge({ 
  status, 
  className,
  showIcon = true,
  size = 'md'
}: DonatStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const sizeClass = SIZE_CLASSES[size]
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold border rounded-full transition-all",
        config.color,
        config.bgColor,
        sizeClass.text,
        sizeClass.padding,
        className
      )}
      title={config.description}
    >
      {showIcon && (
        <span className={sizeClass.icon}>{config.icon}</span>
      )}
      <span>{config.label}</span>
    </span>
  )
}

// Status Badge dengan tooltip detail
export function DonatStatusBadgeWithTooltip({ 
  status, 
  quantity,
  className 
}: DonatStatusBadgeProps & { quantity?: number }) {
  const config = STATUS_CONFIG[status]
  
  return (
    <div className="group relative inline-block">
      <DonatStatusBadge status={status} className={className} />
      {quantity !== undefined && (
        <span className="ml-1 text-xs text-gray-500 font-semibold">
          ({quantity})
        </span>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {config.description}
        {quantity !== undefined && ` • ${quantity} pcs`}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}

// Status selector untuk filter
export function DonatStatusFilter({ 
  selected, 
  onChange,
  showAll = true
}: { 
  selected: DonatStatus | 'all'
  onChange: (status: DonatStatus | 'all') => void
  showAll?: boolean
}) {
  const statuses: (DonatStatus | 'all')[] = showAll 
    ? ['all', 'raw', 'qc', 'ready', 'sold', 'waste', 'rejected', 'otr']
    : ['raw', 'qc', 'ready', 'sold', 'waste', 'rejected', 'otr']
  
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        if (status === 'all') {
          return (
            <button
              key="all"
              onClick={() => onChange('all')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-all border-2",
                selected === 'all'
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              )}
            >
              Semua Status
            </button>
          )
        }
        
        const config = STATUS_CONFIG[status]
        const isSelected = selected === status
        
        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border-2",
              isSelected
                ? cn(config.color, config.bgColor, `border-${config.color.replace('text-', '')}`)
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            )}
            title={config.description}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Progress bar untuk status lifecycle
export function StatusLifecycleProgress({ currentStatus }: { currentStatus: DonatStatus }) {
  const lifecycle: DonatStatus[] = ['raw', 'qc', 'ready', 'sold']
  const wasteStatuses: DonatStatus[] = ['waste', 'rejected']
  
  // Check if waste/rejected
  if (wasteStatuses.includes(currentStatus)) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full" />
        <DonatStatusBadge status={currentStatus} size="sm" />
      </div>
    )
  }
  
  const currentIndex = lifecycle.indexOf(currentStatus)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {lifecycle.map((status, index) => {
          const isActive = index <= currentIndex
          const isCurrent = status === currentStatus
          const config = STATUS_CONFIG[status]
          
          return (
            <div key={status} className="flex items-center flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  isCurrent
                    ? cn(config.bgColor, config.color, "border-current")
                    : isActive
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-gray-100 text-gray-400 border-gray-300"
                )}
                title={config.description}
              >
                <span className="text-sm">{config.icon}</span>
              </div>
              {index < lifecycle.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-1 rounded-full transition-all",
                    isActive ? "bg-green-300" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-500 text-center">
        {STATUS_CONFIG[currentStatus].description}
      </div>
    </div>
  )
}

// Export config untuk digunakan di tempat lain
export { STATUS_CONFIG }
