export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asignaciones_academicas: {
        Row: {
          ano_lectivo: number
          id_asignacion: string
          id_curso: string
          id_docente: string
          id_institucion: string
          id_materia: string
        }
        Insert: {
          ano_lectivo: number
          id_asignacion?: string
          id_curso: string
          id_docente: string
          id_institucion: string
          id_materia: string
        }
        Update: {
          ano_lectivo?: number
          id_asignacion?: string
          id_curso?: string
          id_docente?: string
          id_institucion?: string
          id_materia?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_academicas_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
          {
            foreignKeyName: "asignaciones_academicas_id_docente_fkey"
            columns: ["id_docente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "asignaciones_academicas_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
          {
            foreignKeyName: "asignaciones_academicas_id_materia_fkey"
            columns: ["id_materia"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id_materia"]
          },
        ]
      }
      asistencias: {
        Row: {
          estado: Database["public"]["Enums"]["tipo_estado_asistencia"]
          fecha: string
          id_asignacion: string
          id_asistencia: string
          id_institucion: string
          id_matricula: string
          observacion: string | null
        }
        Insert: {
          estado: Database["public"]["Enums"]["tipo_estado_asistencia"]
          fecha?: string
          id_asignacion: string
          id_asistencia?: string
          id_institucion: string
          id_matricula: string
          observacion?: string | null
        }
        Update: {
          estado?: Database["public"]["Enums"]["tipo_estado_asistencia"]
          fecha?: string
          id_asignacion?: string
          id_asistencia?: string
          id_institucion?: string
          id_matricula?: string
          observacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_academicas"
            referencedColumns: ["id_asignacion"]
          },
          {
            foreignKeyName: "asistencias_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
          {
            foreignKeyName: "asistencias_id_matricula_fkey"
            columns: ["id_matricula"]
            isOneToOne: false
            referencedRelation: "estudiantes_matriculados"
            referencedColumns: ["id_matricula"]
          },
        ]
      }
      calificaciones: {
        Row: {
          actividad: string
          comentario_docente: string | null
          comentario_ia: string | null
          fecha_registro: string | null
          id_asignacion: string
          id_calificacion: string
          id_evidencia: string | null
          id_institucion: string
          id_matricula: string
          id_periodo: string | null
          nota: number
          periodo: number
        }
        Insert: {
          actividad?: string
          comentario_docente?: string | null
          comentario_ia?: string | null
          fecha_registro?: string | null
          id_asignacion: string
          id_calificacion?: string
          id_evidencia?: string | null
          id_institucion: string
          id_matricula: string
          id_periodo?: string | null
          nota: number
          periodo: number
        }
        Update: {
          actividad?: string
          comentario_docente?: string | null
          comentario_ia?: string | null
          fecha_registro?: string | null
          id_asignacion?: string
          id_calificacion?: string
          id_evidencia?: string | null
          id_institucion?: string
          id_matricula?: string
          id_periodo?: string | null
          nota?: number
          periodo?: number
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_academicas"
            referencedColumns: ["id_asignacion"]
          },
          {
            foreignKeyName: "calificaciones_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
          {
            foreignKeyName: "calificaciones_id_matricula_fkey"
            columns: ["id_matricula"]
            isOneToOne: false
            referencedRelation: "estudiantes_matriculados"
            referencedColumns: ["id_matricula"]
          },
        ]
      }

      cursos: {
        Row: {
          id_curso: string
          id_institucion: string
          jornada: string
          nombre: string
        }
        Insert: {
          id_curso?: string
          id_institucion: string
          jornada: string
          nombre: string
        }
        Update: {
          id_curso?: string
          id_institucion?: string
          jornada?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "cursos_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
        ]
      }
      estudiantes_matriculados: {
        Row: {
          ano_lectivo: number
          id_curso: string
          id_estudiante: string
          id_institucion: string
          id_matricula: string
        }
        Insert: {
          ano_lectivo: number
          id_curso: string
          id_estudiante: string
          id_institucion: string
          id_matricula?: string
        }
        Update: {
          ano_lectivo?: number
          id_curso?: string
          id_estudiante?: string
          id_institucion?: string
          id_matricula?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudiantes_matriculados_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
          {
            foreignKeyName: "estudiantes_matriculados_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "estudiantes_matriculados_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
        ]
      }
      escala_valoracion: {
        Row: {
          fecha_creacion: string | null
          id_escala: string
          id_institucion: string
          nombre_desempeno: Database["public"]["Enums"]["tipo_desempeno_escala"]
          nota_maxima: number
          nota_minima: number
        }
        Insert: {
          fecha_creacion?: string | null
          id_escala?: string
          id_institucion: string
          nombre_desempeno: Database["public"]["Enums"]["tipo_desempeno_escala"]
          nota_maxima: number
          nota_minima: number
        }
        Update: {
          fecha_creacion?: string | null
          id_escala?: string
          id_institucion?: string
          nombre_desempeno?: Database["public"]["Enums"]["tipo_desempeno_escala"]
          nota_maxima?: number
          nota_minima?: number
        }
        Relationships: [
          {
            foreignKeyName: "escala_valoracion_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          }
        ]
      }
      evidencias_logros: {
        Row: {
          descripcion: string
          fecha_creacion: string | null
          id_asignacion: string
          id_logro: string
          id_periodo: string
        }
        Insert: {
          descripcion: string
          fecha_creacion?: string | null
          id_asignacion: string
          id_logro?: string
          id_periodo: string
        }
        Update: {
          descripcion?: string
          fecha_creacion?: string | null
          id_asignacion?: string
          id_logro?: string
          id_periodo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_logros_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_academicas"
            referencedColumns: ["id_asignacion"]
          },
          {
            foreignKeyName: "evidencias_logros_id_periodo_fkey"
            columns: ["id_periodo"]
            isOneToOne: false
            referencedRelation: "periodos_academicos"
            referencedColumns: ["id_periodo"]
          }
        ]
      }
      instituciones: {
        Row: {
          dominio_personalizado: string | null
          estado_suscripcion: Database["public"]["Enums"]["tipo_estado_suscripcion"]
          fecha_registro: string | null
          id_institucion: string
          id_suscripcion: number | null
          nit: string
          nomenclatura_cursos: string | null
          nombre_legal: string
        }
        Insert: {
          dominio_personalizado?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["tipo_estado_suscripcion"]
          fecha_registro?: string | null
          id_institucion?: string
          id_suscripcion?: number | null
          nit: string
          nomenclatura_cursos?: string | null
          nombre_legal: string
        }
        Update: {
          dominio_personalizado?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["tipo_estado_suscripcion"]
          fecha_registro?: string | null
          id_institucion?: string
          id_suscripcion?: number | null
          nit?: string
          nomenclatura_cursos?: string | null
          nombre_legal?: string
        }
        Relationships: [
          {
            foreignKeyName: "instituciones_id_suscripcion_fkey"
            columns: ["id_suscripcion"]
            isOneToOne: false
            referencedRelation: "planes_suscripcion"
            referencedColumns: ["id_suscripcion"]
          },
        ]
      }
      logs_ia_tokens: {
        Row: {
          costo_estimado: number
          fecha_peticion: string | null
          id_ia_token: string
          id_institucion: string
          servicio_ia: string
          tokens_usados: number
        }
        Insert: {
          costo_estimado: number
          fecha_peticion?: string | null
          id_ia_token?: string
          id_institucion: string
          servicio_ia: string
          tokens_usados: number
        }
        Update: {
          costo_estimado?: number
          fecha_peticion?: string | null
          id_ia_token?: string
          id_institucion?: string
          servicio_ia?: string
          tokens_usados?: number
        }
        Relationships: [
          {
            foreignKeyName: "logs_ia_tokens_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
        ]
      }
      materias: {
        Row: {
          area: string
          id_institucion: string
          id_materia: string
          nombre: string
        }
        Insert: {
          area: string
          id_institucion: string
          id_materia?: string
          nombre: string
        }
        Update: {
          area?: string
          id_institucion?: string
          id_materia?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "materias_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
        ]
      }
      observador_digital: {
        Row: {
          fecha_registro: string | null
          fecha_firma: string | null
          firmado: boolean
          firmado_por: string | null
          id_docente: string
          id_estudiante: string
          id_institucion: string
          id_observador: string
          observacion_formal_ia: string | null
          observacion_informal: string
          tipo_nota: Database["public"]["Enums"]["tipo_nota_observador"]
        }
        Insert: {
          fecha_registro?: string | null
          fecha_firma?: string | null
          firmado?: boolean
          firmado_por?: string | null
          id_docente: string
          id_estudiante: string
          id_institucion: string
          id_observador?: string
          observacion_formal_ia?: string | null
          observacion_informal: string
          tipo_nota: Database["public"]["Enums"]["tipo_nota_observador"]
        }
        Update: {
          fecha_registro?: string | null
          fecha_firma?: string | null
          firmado?: boolean
          firmado_por?: string | null
          id_docente?: string
          id_estudiante?: string
          id_institucion?: string
          id_observador?: string
          observacion_formal_ia?: string | null
          observacion_informal?: string
          tipo_nota?: Database["public"]["Enums"]["tipo_nota_observador"]
        }
        Relationships: [
          {
            foreignKeyName: "observador_digital_id_docente_fkey"
            columns: ["id_docente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "observador_digital_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "observador_digital_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
          {
            foreignKeyName: "observador_digital_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      perfiles_acudientes_estudiantes: {
        Row: {
          id_acudiente: string
          id_acudiente_estudiante: string
          id_estudiante: string
          id_institucion: string
          parentesco: string
        }
        Insert: {
          id_acudiente: string
          id_acudiente_estudiante?: string
          id_estudiante: string
          id_institucion: string
          parentesco: string
        }
        Update: {
          id_acudiente?: string
          id_acudiente_estudiante?: string
          id_estudiante?: string
          id_institucion?: string
          parentesco?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_acudientes_estudiantes_id_acudiente_fkey"
            columns: ["id_acudiente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "perfiles_acudientes_estudiantes_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "perfiles_acudientes_estudiantes_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
        ]
      }
      periodos_academicos: {
        Row: {
          activo: boolean
          fecha_creacion: string | null
          fecha_fin: string
          fecha_inicio: string
          id_institucion: string
          id_periodo: string
          numero_periodo: number
        }
        Insert: {
          activo?: boolean
          fecha_creacion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id_institucion: string
          id_periodo?: string
          numero_periodo: number
        }
        Update: {
          activo?: boolean
          fecha_creacion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id_institucion?: string
          id_periodo?: string
          numero_periodo?: number
        }
        Relationships: [
          {
            foreignKeyName: "periodos_academicos_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          }
        ]
      }
      planes_suscripcion: {
        Row: {
          id_suscripcion: number
          limite_usuarios: number
          nombre: string
          precio: number
        }
        Insert: {
          id_suscripcion?: never
          limite_usuarios: number
          nombre: string
          precio: number
        }
        Update: {
          id_suscripcion?: never
          limite_usuarios?: number
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          email: string
          fecha_registro: string | null
          id_institucion: string
          id_usuario: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["tipo_rol_usuario"]
        }
        Insert: {
          email: string
          fecha_registro?: string | null
          id_institucion: string
          id_usuario: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["tipo_rol_usuario"]
        }
        Update: {
          email?: string
          fecha_registro?: string | null
          id_institucion?: string
          id_usuario?: string
          nombre_completo?: string
          rol?: Database["public"]["Enums"]["tipo_rol_usuario"]
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_institucion_fkey"
            columns: ["id_institucion"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id_institucion"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tipo_desempeno_escala: "SUPERIOR" | "ALTO" | "BASICO" | "BAJO"
      tipo_estado_asistencia:
        | "PRESENTE"
        | "FALTA_JUSTIFICADA"
        | "FALTA_INJUSTIFICADA"
        | "RETRASO"
      tipo_estado_suscripcion: "ACTIVO" | "INACTIVE" | "PRUEBA"
      tipo_nota_observador: "PEDAGOGICA" | "DISCIPLINARIA" | "LOGRO_DESTACADO"
      tipo_rol_usuario: "ADMIN" | "DOCENTE" | "ESTUDIANTE" | "ACUDIENTE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo_estado_asistencia: [
        "PRESENTE",
        "FALTA_JUSTIFICADA",
        "FALTA_INJUSTIFICADA",
        "RETRASO",
      ],
      tipo_estado_suscripcion: ["ACTIVO", "INACTIVE", "PRUEBA"],
      tipo_nota_observador: ["PEDAGOGICA", "DISCIPLINARIA", "LOGRO_DESTACADO"],
      tipo_rol_usuario: ["ADMIN", "DOCENTE", "ESTUDIANTE", "ACUDIENTE"],
    },
  },
} as const

