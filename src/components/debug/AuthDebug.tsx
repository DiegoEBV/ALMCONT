import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { localAuth } from '../../services/localAuth'

const AuthDebug: React.FC = () => {
  const { user, session, loading } = useAuth()
  const currentUser = localAuth.getCurrentUser()
  const currentSession = localAuth.getSession()

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-lg mb-2">Auth Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Hook Loading:</strong> {loading ? 'true' : 'false'}
        </div>
        <div>
          <strong>Hook User:</strong> {user ? `${user.email} (${user.rol})` : 'null'}
        </div>
        <div>
          <strong>Hook Session:</strong> {session ? 'exists' : 'null'}
        </div>
        <div>
          <strong>LocalAuth User:</strong> {currentUser ? `${currentUser.email} (${currentUser.rol})` : 'null'}
        </div>
        <div>
          <strong>LocalAuth Session:</strong> {currentSession ? 'exists' : 'null'}
        </div>
        <div>
          <strong>User ID:</strong> {currentUser?.id || 'N/A'}
        </div>
      </div>
    </div>
  )
}

export default AuthDebug