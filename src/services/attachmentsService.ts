import { supabase } from '../lib/supabase'

export const attachmentsService = {
  async uploadRequirementAttachments(requerimientoId: string, files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
        const path = `requerimientos/${requerimientoId}/${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('documents').getPublicUrl(path)
        urls.push(data.publicUrl)
      } catch (e) {
        console.error('Error subiendo adjunto:', e)
      }
    }
    return urls
  }
}

