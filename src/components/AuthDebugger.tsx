import React from 'react'
import { useAuth } from '../hooks/useAuth'

const AuthDebugger: React.FC = () => {
  const { user, loading, session } = useAuth()

  console.log('🔍 AuthDebugger: Rendering')
  console.log('🔍 AuthDebugger: Loading:', loading)
  console.log('🔍 AuthDebugger: User:', user)
  console.log('🔍 AuthDebugger: Session:', session)

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded z-50">
      <div className="text-sm">
        <div><strong>Auth Status:</strong></div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>User: {user ? `${user.nombre} (${user.rol})` : 'Not authenticated'}</div>
        <div>Obra ID: {user?.obra_id || 'None'}</div>
        <div>Session: {session ? 'Active' : 'None'}</div>
      </div>
    </div>
  )
}

export default AuthDebugger