'use client'

interface LoadingOverlayProps {
  isVisible: boolean
}

export default function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" />
      
      {/* Centered loading spinner */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-gray-700 font-medium">Cargando...</p>
      </div>
    </div>
  )
}