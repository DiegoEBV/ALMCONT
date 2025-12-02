export type UserRole = 'ADMIN' | 'COORDINACION' | 'LOGISTICA' | 'ALMACENERO' | 'PRODUCCION' | 'RESIDENTE' | 'PENDIENTE'

export interface SupabaseUserMetadata {
  rol?: UserRole
  nombre?: string
  apellido?: string
  role?: UserRole
}

export interface SupabaseAppMetadata {
  rol?: UserRole
  role?: UserRole
}

export interface ObraLite {
  id?: string
  nombre?: string
  codigo?: string
}

export interface AuthUser {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: UserRole
  obra_id: string
  activo: boolean
  obra?: ObraLite | null
  supabaseId?: string
}

export interface AuthSession {
  user: AuthUser
  token: string
  expiresAt: number
}

export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<AuthUser>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateObraAsignada: (obraId: string | null) => Promise<boolean>
}
