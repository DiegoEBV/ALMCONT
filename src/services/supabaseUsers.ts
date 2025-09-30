import { supabase } from '../lib/supabase'
import { localAuth } from './localAuth'
import { isValidUUID, validateUUID, sanitizeUUID } from '../utils/uuidValidator'

export const supabaseUsersService = {
  // Actualizar obra asignada en Supabase
  async updateObraAsignada(userId: string, obraId: string | null): Promise<boolean> {
    try {
      // Validar que userId sea un UUID válido
      if (!isValidUUID(userId)) {
        console.error('Error: userId inválido para Supabase:', userId)
        throw new Error(`ID de usuario inválido: "${userId}". Se esperaba un UUID válido.`)
      }

      // Validar obraId si no es null
      if (obraId !== null && !isValidUUID(obraId)) {
        console.error('Error: obraId inválido para Supabase:', obraId)
        throw new Error(`ID de obra inválido: "${obraId}". Se esperaba un UUID válido o null.`)
      }

      console.log('Actualizando obra en Supabase:', { userId, obraId })

      const { error } = await supabase
        .from('usuarios')
        .update({ 
          obra_id: obraId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating obra in Supabase:', error)
        return false
      }

      console.log('Obra actualizada exitosamente en Supabase')
      return true
    } catch (error) {
      console.error('Error updating obra in Supabase:', error)
      return false
    }
  },

  // Obtener datos del usuario desde Supabase
  async getUserData(userId: string) {
    try {
      // Validar que userId sea un UUID válido
      if (!isValidUUID(userId)) {
        console.error('Error: userId inválido para consulta Supabase:', userId)
        return null
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user from Supabase:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user from Supabase:', error)
      return null
    }
  },

  // Sincronizar obra asignada del usuario actual
  async syncCurrentUserObraAsignada(obraId: string | null): Promise<boolean> {
    const user = localAuth.getCurrentUser()
    if (!user) {
      return false
    }

    // Actualizar en Supabase
    const supabaseSuccess = await this.updateObraAsignada(user.id, obraId)
    
    // Actualizar localmente solo si Supabase fue exitoso
    if (supabaseSuccess) {
      const localSuccess = await localAuth.updateObraAsignada(obraId)
      return localSuccess
    }

    return false
  }
}