import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  showValue?: boolean
  isPlaying?: boolean
}

export function CircularProgress({
  value,
  max = 100,
  size = 200,
  strokeWidth = 8,
  showValue = false,
  isPlaying = false,
  className,
  ...props
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-border opacity-20"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary"
          style={{
            strokeLinecap: "round",
            transition: "stroke-dashoffset 0.1s linear",
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {showValue ? (
          <span className="text-2xl font-medium text-foreground">
            {Math.round(percentage)}%
          </span>
        ) : (
          props.children
        )}
      </div>
    </div>
  )
}

interface LinearProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  height?: number
  showLabels?: boolean
}

export function LinearProgress({
  value,
  max = 100,
  height = 4,
  showLabels = false,
  className,
  ...props
}: LinearProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>0</span>
          <span>{max}</span>
        </div>
      )}
      <div 
        className="relative w-full bg-border/20 rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className="absolute top-0 left-0 h-full bg-primary rounded-full"
          style={{ 
            width: `${percentage}%`,
            transition: "width 0.1s linear"
          }}
        />
      </div>
    </div>
  )
}