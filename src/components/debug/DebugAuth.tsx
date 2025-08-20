import React from 'react'
import { useAuth } from '../../hooks/useAuth'

const DebugAuth: React.FC = () => {
  const { user, session, loading } = useAuth()

  console.log('🐛 DebugAuth render:', { user, session: !!session, loading })

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h2 className="text-lg font-bold mb-2">Debug Auth Status</h2>
      <div className="space-y-2">
        <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
        <p><strong>User:</strong> {user ? user.email : 'null'}</p>
        <p><strong>Session:</strong> {session ? 'exists' : 'null'}</p>
        <p><strong>User Role:</strong> {user?.rol || 'N/A'}</p>
      </div>
    </div>
  )
}

export default DebugAuth