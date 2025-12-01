import React from 'react'
import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'blue' | 'gray' | 'white'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

const colorClasses = {
  blue: 'text-blue-600',
  gray: 'text-gray-600',
  white: 'text-white'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  color = 'blue'
}) => {
  const ring = (
    <div
      className={clsx(
        'relative',
        sizeClasses[size],
        className
      )}
    >
      <div className="absolute inset-0 rounded-full animate-spin" style={{
        background:
          'conic-gradient(from 0deg, rgba(59,130,246,0.9), rgba(59,130,246,0.2) 40%, rgba(59,130,246,0.05) 60%, rgba(59,130,246,0.9) 100%)'
      }} />
      <div className={clsx('absolute inset-[3px] rounded-full', colorClasses[color], 'bg-white')} />
    </div>
  )
  return ring
}

export default LoadingSpinner
