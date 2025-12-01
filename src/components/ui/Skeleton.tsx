import React from 'react'

interface SkeletonProps {
  className?: string
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`relative overflow-hidden bg-gray-200 rounded ${className || ''}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    <style>{`
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    `}</style>
  </div>
)

export default Skeleton
