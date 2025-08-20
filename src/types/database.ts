export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          apellido: string
          rol: string
          obra_id: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nombre: string
          apellido: string
          rol: string
          obra_id: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          apellido?: string
          rol?: string
          obra_id?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      obras: {
        Row: {
          id: string
          nombre: string
          codigo: string
          ubicacion: string
          fecha_inicio: string
          fecha_fin_estimada: string | null
          estado: string
          presupuesto: number | null
          responsable: string
          descripcion: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          codigo: string
          ubicacion: string
          fecha_inicio: string
          fecha_fin_estimada?: string | null
          estado: string
          presupuesto?: number | null
          responsable: string
          descripcion?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          codigo?: string
          ubicacion?: string
          fecha_inicio?: string
          fecha_fin_estimada?: string | null
          estado?: string
          presupuesto?: number | null
          responsable?: string
          descripcion?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      materiales: {
        Row: {
          id: string
          codigo: string
          nombre: string
          descripcion: string | null
          categoria: string
          subcategoria: string | null
          unidad: string
          precio_referencial: number | null
          precio_unitario: number | null
          especificaciones: string | null
          proveedor_preferido: string | null
          stock_minimo: number | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo: string
          nombre: string
          descripcion?: string | null
          categoria: string
          subcategoria?: string | null
          unidad: string
          precio_referencial?: number | null
          precio_unitario?: number | null
          especificaciones?: string | null
          proveedor_preferido?: string | null
          stock_minimo?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          nombre?: string
          descripcion?: string | null
          categoria?: string
          subcategoria?: string | null
          unidad?: string
          precio_referencial?: number | null
          precio_unitario?: number | null
          especificaciones?: string | null
          proveedor_preferido?: string | null
          stock_minimo?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      approval_rules: {
        Row: {
          id: string
          nombre: string
          tipo_documento: string
          condiciones: Json
          aprobadores: Json
          orden_aprobacion: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo_documento: string
          condiciones: Json
          aprobadores: Json
          orden_aprobacion: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          tipo_documento?: string
          condiciones?: Json
          aprobadores?: Json
          orden_aprobacion?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reorder_configs: {
        Row: {
          id: string
          material_id: string
          punto_reorden: number
          cantidad_maxima: number
          proveedor_preferido: string | null
          tiempo_entrega_dias: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          punto_reorden: number
          cantidad_maxima: number
          proveedor_preferido?: string | null
          tiempo_entrega_dias: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          punto_reorden?: number
          cantidad_maxima?: number
          proveedor_preferido?: string | null
          tiempo_entrega_dias?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          codigo: string
          nombre: string
          tipo: string
          capacidad_maxima: number | null
          ubicacion_fisica: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo: string
          nombre: string
          tipo: string
          capacidad_maxima?: number | null
          ubicacion_fisica?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          nombre?: string
          tipo?: string
          capacidad_maxima?: number | null
          ubicacion_fisica?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cyclic_counts: {
        Row: {
          id: string
          fecha_programada: string
          clasificacion_abc: string
          estado: string
          usuario_asignado: string | null
          fecha_inicio: string | null
          fecha_fin: string | null
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha_programada: string
          clasificacion_abc: string
          estado: string
          usuario_asignado?: string | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha_programada?: string
          clasificacion_abc?: string
          estado?: string
          usuario_asignado?: string | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      returns: {
        Row: {
          id: string
          numero_devolucion: string
          fecha_devolucion: string
          motivo: string
          estado: string
          usuario_id: string
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero_devolucion: string
          fecha_devolucion: string
          motivo: string
          estado: string
          usuario_id: string
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_devolucion?: string
          fecha_devolucion?: string
          motivo?: string
          estado?: string
          usuario_id?: string
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_ubicaciones: {
        Row: {
          id: string
          obra_id: string
          material_id: string
          location_id: string
          cantidad: number
          fecha_asignacion: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          obra_id: string
          material_id: string
          location_id: string
          cantidad: number
          fecha_asignacion: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          obra_id?: string
          material_id?: string
          location_id?: string
          cantidad?: number
          fecha_asignacion?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_obra_material: {
        Row: {
          id: string
          obra_id: string
          material_id: string
          cantidad_actual: number
          cantidad_minima: number
          ubicacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          obra_id: string
          material_id: string
          cantidad_actual: number
          cantidad_minima: number
          ubicacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          obra_id?: string
          material_id?: string
          cantidad_actual?: number
          cantidad_minima?: number
          ubicacion?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ubicaciones: {
        Row: {
          id: string
          codigo: string
          zona: string
          tipo: string
          capacidad_maxima: number
          activa: boolean
          restricciones_tipo?: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo: string
          zona: string
          tipo: string
          capacidad_maxima: number
          activa?: boolean
          restricciones_tipo?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          zona?: string
          tipo?: string
          capacidad_maxima?: number
          activa?: boolean
          restricciones_tipo?: Json
          created_at?: string
          updated_at?: string
        }
      }
      detalle_conteos: {
         Row: {
           id: string
           conteo_id: string
           material_id: string
           ubicacion_id: string
           cantidad_sistema: number
           cantidad_fisica: number
           diferencia: number
           observaciones?: string
           created_at: string
         }
         Insert: {
           id?: string
           conteo_id: string
           material_id: string
           ubicacion_id: string
           cantidad_sistema: number
           cantidad_fisica: number
           diferencia: number
           observaciones?: string
           created_at?: string
         }
         Update: {
           id?: string
           conteo_id?: string
           material_id?: string
           ubicacion_id?: string
           cantidad_sistema?: number
           cantidad_fisica?: number
           diferencia?: number
           observaciones?: string
           created_at?: string
         }
       }
       conteos_ciclicos: {
          Row: {
            id: string
            nombre: string
            descripcion?: string
            tipo: string
            estado: string
            fecha_programada: string
            fecha_inicio?: string
            fecha_fin?: string
            usuario_responsable: string
            configuracion: Json
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            nombre: string
            descripcion?: string
            tipo: string
            estado?: string
            fecha_programada: string
            fecha_inicio?: string
            fecha_fin?: string
            usuario_responsable: string
            configuracion: Json
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            nombre?: string
            descripcion?: string
            tipo?: string
            estado?: string
            fecha_programada?: string
            fecha_inicio?: string
            fecha_fin?: string
            usuario_responsable?: string
            configuracion?: Json
            created_at?: string
            updated_at?: string
          }
        }
        aprobaciones: {
          Row: {
            id: string
            tipo: string
            referencia_id: string
            estado: string
            solicitante_id: string
            aprobador_id?: string
            fecha_solicitud: string
            fecha_respuesta?: string
            comentarios?: string
            datos_solicitud: Json
            nivel_aprobacion: number
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            tipo: string
            referencia_id: string
            estado?: string
            solicitante_id: string
            aprobador_id?: string
            fecha_solicitud?: string
            fecha_respuesta?: string
            comentarios?: string
            datos_solicitud: Json
            nivel_aprobacion: number
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            tipo?: string
            referencia_id?: string
            estado?: string
            solicitante_id?: string
            aprobador_id?: string
            fecha_solicitud?: string
            fecha_respuesta?: string
            comentarios?: string
            datos_solicitud?: Json
            nivel_aprobacion?: number
            created_at?: string
            updated_at?: string
          }
        }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}