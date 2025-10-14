import React, { useState, useCallback, useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const Login: React.FC = () => {
  const { user, signIn, loading } = useAuth()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: 'logistica@obra.com',
    password: 'password123'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Memoizar la redirección para evitar re-renderizados innecesarios
  const redirectPath = useMemo(() => {
    return (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  }, [location.state])

  // Optimizar el manejo del formulario con useCallback
  const handleInputChange = useCallback((field: 'email' | 'password') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }, [])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return // Prevenir múltiples envíos
    
    setError('')
    setIsSubmitting(true)

    try {
      await signIn(formData.email, formData.password)
      // No resetear isSubmitting aquí, dejar que la redirección maneje el estado
    } catch (err: unknown) {
      console.error('❌ Error en login:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(
        errorMessage.includes('No tienes permisos para ver usuarios')
          ? 'Error de permisos. Intenta cerrar sesión completamente y volver a iniciar.'
          : errorMessage === 'Invalid login credentials'
          ? 'Credenciales inválidas. Verifica tu email y contraseña.'
          : errorMessage.includes('Email not confirmed')
          ? 'Email no confirmado. Revisa tu bandeja de entrada.'
          : errorMessage.includes('Too many requests')
          ? 'Demasiados intentos. Espera un momento antes de intentar nuevamente.'
          : 'Error al iniciar sesión. Intenta nuevamente.'
      )
      setIsSubmitting(false)
    }
  }, [formData.email, formData.password, isSubmitting, signIn])

  // Memoizar la validación del formulario
  const isFormValid = useMemo(() => {
    return formData.email.trim() !== '' && formData.password.trim() !== ''
  }, [formData.email, formData.password])

  // Si ya está autenticado, redirigir (DESPUÉS de todos los hooks)
  if (user && !loading) {
    return <Navigate to={redirectPath} replace />
  }

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sistema de Almacén
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para acceder al sistema
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="tu@email.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={togglePasswordVisibility}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={!isFormValid || isSubmitting}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Sistema de Gestión de Almacén de Obra
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login