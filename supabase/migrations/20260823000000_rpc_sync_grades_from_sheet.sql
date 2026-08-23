-- =====================================================================
-- 1. Asegurar índice único para el UPSERT en calificaciones
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS unique_calificacion_evidencia_idx 
ON public.calificaciones (id_matricula, id_asignacion, id_periodo, id_evidencia);

-- =====================================================================
-- 2. FUNCIÓN RPC: SINCRONIZACIÓN DE CALIFICACIONES DESDE GOOGLE SHEETS (n8n)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.sincronizar_calificaciones_sheet(
  p_items JSONB,
  p_periodo_num INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_email TEXT;
  v_materia TEXT;
  v_curso TEXT;
  v_notas JSONB;
  v_grado_str TEXT;
  
  v_id_institucion UUID;
  v_id_periodo UUID;
  v_numero_periodo INTEGER;
  
  v_id_matricula UUID;
  v_id_asignacion UUID;
  v_id_materia UUID;
  v_ev1_id UUID;
  v_ev2_id UUID;
  v_ev3_id UUID;
  
  v_insertadas INTEGER := 0;
  v_total_alumnos INTEGER := 0;
  
  v_advertencias JSONB := '[]'::JSONB;
  v_errores JSONB := '[]'::JSONB;
  v_cursos_procesados TEXT[] := ARRAY[]::TEXT[];
  v_cursos_pendientes JSONB := '[]'::JSONB;
  v_asig RECORD;
BEGIN
  -- 1. Determinar el periodo académico activo (o el especificado)
  IF p_periodo_num IS NOT NULL THEN
    SELECT id_periodo, id_institucion, numero_periodo
    INTO v_id_periodo, v_id_institucion, v_numero_periodo
    FROM public.periodos_academicos
    WHERE numero_periodo = p_periodo_num
    LIMIT 1;
  ELSE
    SELECT id_periodo, id_institucion, numero_periodo
    INTO v_id_periodo, v_id_institucion, v_numero_periodo
    FROM public.periodos_academicos
    WHERE activo = TRUE
    LIMIT 1;
  END IF;

  -- Fallback si no hay periodo activo
  IF v_id_periodo IS NULL THEN
    SELECT id_periodo, id_institucion, numero_periodo
    INTO v_id_periodo, v_id_institucion, v_numero_periodo
    FROM public.periodos_academicos
    ORDER BY numero_periodo ASC
    LIMIT 1;
  END IF;

  IF v_id_periodo IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'mensaje', 'No se encontró ningún periodo académico configurado en el sistema.'
    );
  END IF;

  -- 2. Procesar cada fila de alumno recibida desde n8n
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Si el item no es una fila válida, continuar
    IF v_item->>'status' IS DISTINCT FROM 'VALID_ROW' THEN
      CONTINUE;
    END IF;

    v_email := LOWER(TRIM(v_item->>'email'));
    v_materia := TRIM(v_item->>'materia');
    v_curso := TRIM(v_item->>'curso');
    v_notas := v_item->'notas';
    
    -- Extraer el grado numérico (ej: "10-A" -> "10")
    v_grado_str := SPLIT_PART(v_curso, '-', 1);

    -- Registrar curso procesado para la comparación final
    IF NOT (v_materia || ' ' || v_curso = ANY(v_cursos_procesados)) THEN
      v_cursos_procesados := array_append(v_cursos_procesados, v_materia || ' ' || v_curso);
    END IF;

    -- A. Buscar la matrícula del estudiante en ese curso
    SELECT em.id_matricula
    INTO v_id_matricula
    FROM public.estudiantes_matriculados em
    JOIN public.usuarios u ON u.id_usuario = em.id_estudiante
    JOIN public.cursos c ON c.id_curso = em.id_curso
    WHERE LOWER(TRIM(u.email)) = v_email
      AND (c.nombre ILIKE v_curso OR REPLACE(c.nombre, '-', '') ILIKE REPLACE(v_curso, '-', ''))
      AND em.id_institucion = v_id_institucion
    LIMIT 1;

    IF v_id_matricula IS NULL THEN
      v_advertencias := v_advertencias || jsonb_build_object(
        'tipo', 'ESTUDIANTE_NO_MATRICULADO',
        'mensaje', format('Estudiante %s (%s) no encontrado en la matrícula del curso %s.', v_item->>'estudiante', v_email, v_curso)
      );
      CONTINUE;
    END IF;

    -- B. Buscar la asignación académica del docente
    SELECT aa.id_asignacion, aa.id_materia
    INTO v_id_asignacion, v_id_materia
    FROM public.asignaciones_academicas aa
    JOIN public.materias m ON m.id_materia = aa.id_materia
    JOIN public.cursos c ON c.id_curso = aa.id_curso
    WHERE (m.nombre ILIKE v_materia)
      AND (c.nombre ILIKE v_curso OR REPLACE(c.nombre, '-', '') ILIKE REPLACE(v_curso, '-', ''))
      AND aa.id_institucion = v_id_institucion
    LIMIT 1;

    IF v_id_asignacion IS NULL THEN
      v_advertencias := v_advertencias || jsonb_build_object(
        'tipo', 'ASIGNACION_NO_ENCONTRADA',
        'mensaje', format('No existe asignación académica para %s en el curso %s.', v_materia, v_curso)
      );
      CONTINUE;
    END IF;

    -- C. Obtener IDs de las Evidencias (1, 2 y 3) de esa materia y grado
    SELECT id_evidencia INTO v_ev1_id FROM public.evidencias 
    WHERE id_materia = v_id_materia AND (grado = v_grado_str OR grado = v_curso) AND orden = 1 LIMIT 1;
    
    SELECT id_evidencia INTO v_ev2_id FROM public.evidencias 
    WHERE id_materia = v_id_materia AND (grado = v_grado_str OR grado = v_curso) AND orden = 2 LIMIT 1;
    
    SELECT id_evidencia INTO v_ev3_id FROM public.evidencias 
    WHERE id_materia = v_id_materia AND (grado = v_grado_str OR grado = v_curso) AND orden = 3 LIMIT 1;

    v_total_alumnos := v_total_alumnos + 1;

    -- D. UPSERT de Evidencia 1
    IF (v_notas->>'evidencia_1') IS NOT NULL AND v_ev1_id IS NOT NULL THEN
      INSERT INTO public.calificaciones (
        id_matricula, id_asignacion, id_periodo, periodo, id_evidencia, actividad, nota, id_institucion, fecha_registro
      ) VALUES (
        v_id_matricula, v_id_asignacion, v_id_periodo, v_numero_periodo, v_ev1_id, 'evidencia', (v_notas->>'evidencia_1')::NUMERIC, v_id_institucion, NOW()
      )
      ON CONFLICT (id_matricula, id_asignacion, id_periodo, id_evidencia) 
      DO UPDATE SET nota = EXCLUDED.nota, fecha_registro = NOW();
      v_insertadas := v_insertadas + 1;
    END IF;

    -- E. UPSERT de Evidencia 2
    IF (v_notas->>'evidencia_2') IS NOT NULL AND v_ev2_id IS NOT NULL THEN
      INSERT INTO public.calificaciones (
        id_matricula, id_asignacion, id_periodo, periodo, id_evidencia, actividad, nota, id_institucion, fecha_registro
      ) VALUES (
        v_id_matricula, v_id_asignacion, v_id_periodo, v_numero_periodo, v_ev2_id, 'evidencia', (v_notas->>'evidencia_2')::NUMERIC, v_id_institucion, NOW()
      )
      ON CONFLICT (id_matricula, id_asignacion, id_periodo, id_evidencia) 
      DO UPDATE SET nota = EXCLUDED.nota, fecha_registro = NOW();
      v_insertadas := v_insertadas + 1;
    END IF;

    -- F. UPSERT de Evidencia 3
    IF (v_notas->>'evidencia_3') IS NOT NULL AND v_ev3_id IS NOT NULL THEN
      INSERT INTO public.calificaciones (
        id_matricula, id_asignacion, id_periodo, periodo, id_evidencia, actividad, nota, id_institucion, fecha_registro
      ) VALUES (
        v_id_matricula, v_id_asignacion, v_id_periodo, v_numero_periodo, v_ev3_id, 'evidencia', (v_notas->>'evidencia_3')::NUMERIC, v_id_institucion, NOW()
      )
      ON CONFLICT (id_matricula, id_asignacion, id_periodo, id_evidencia) 
      DO UPDATE SET nota = EXCLUDED.nota, fecha_registro = NOW();
      v_insertadas := v_insertadas + 1;
    END IF;

  END LOOP;

  -- 3. Calcular cursos/materias de la institución que no estuvieron en este cargue (Validación)
  FOR v_asig IN 
    SELECT DISTINCT m.nombre AS materia_nombre, c.nombre AS curso_nombre
    FROM public.asignaciones_academicas aa
    JOIN public.materias m ON m.id_materia = aa.id_materia
    JOIN public.cursos c ON c.id_curso = aa.id_curso
    WHERE aa.id_institucion = v_id_institucion
  LOOP
    IF NOT (v_asig.materia_nombre || ' ' || v_asig.curso_nombre = ANY(v_cursos_procesados)) THEN
      v_cursos_pendientes := v_cursos_pendientes || jsonb_build_object(
        'materia', v_asig.materia_nombre,
        'curso', v_asig.curso_nombre
      );
    END IF;
  END LOOP;

  -- 4. Retornar resumen estructurado
  RETURN jsonb_build_object(
    'status', CASE WHEN jsonb_array_length(v_errores) > 0 THEN 'partial_success' ELSE 'success' END,
    'periodo_procesado', v_numero_periodo,
    'resumen', jsonb_build_object(
      'total_alumnos_procesados', v_total_alumnos,
      'total_calificaciones_guardadas', v_insertadas,
      'cursos_actualizados_en_este_cargue', v_cursos_procesados,
      'total_cursos_pendientes', jsonb_array_length(v_cursos_pendientes)
    ),
    'cursos_pendientes', v_cursos_pendientes,
    'advertencias', v_advertencias,
    'errores', v_errores
  );
END;
$$;
