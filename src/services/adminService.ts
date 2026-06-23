import { createAdminClient } from '@/utils/supabase/admin';

export type BulkImportErrorItem = {
  row: number;
  error: string;
};

export type BulkImportResult = {
  error?: string;
  success?: boolean;
  successCount?: number;
  errorCount?: number;
  errors?: BulkImportErrorItem[];
};

const VALID_BULK_ROLES = ['DOCENTE', 'ESTUDIANTE', 'ACUDIENTE'] as const;
type BulkRole = (typeof VALID_BULK_ROLES)[number];

interface UniqueRow {
  nombreCompleto: string;
  email: string;
  rawRol: string;
  cursoNombre: string | null;
  jornada: string;
  anoLectivo: number;
  cargaAcademica: string | null;
  emailEstudianteVinculado: string | null;
  parentesco: string;
  lineNum: number;
}

// Helper para procesamiento concurrente con límite
async function runInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(item => fn(item)));
    results.push(...chunkResults);
  }
  return results;
}

export async function processBulkImport(
  lines: string[],
  idInstitucion: string
): Promise<BulkImportResult> {
  const adminClient = createAdminClient();

  // Normalizar cabeceras a minúsculas y sin comillas
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('nombre_completo');
  const rolIdx = headers.indexOf('rol');
  const cursoIdx = headers.indexOf('curso');
  const jornadaIdx = headers.indexOf('jornada');
  const anoLectivoIdx = headers.indexOf('ano_lectivo');
  const cargaAcademicaIdx = headers.indexOf('carga_academica');
  const emailEstudianteVinculadoIdx = headers.indexOf('email_estudiante_vinculado');
  const parentescoIdx = headers.indexOf('parentesco');

  if (emailIdx === -1 || nameIdx === -1 || rolIdx === -1) {
    return {
      error:
        'El archivo CSV debe contener al menos las columnas obligatorias: nombre_completo, email, rol.',
    };
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: BulkImportErrorItem[] = [];

  const uniqueRows = new Map<string, UniqueRow>();

  // 1. Fase de Lectura y Validación de Formato
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split por comas respetando comillas
    const fields = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((f) => f.trim().replace(/"/g, ''));

    const email = fields[emailIdx]?.toLowerCase().trim();
    const nombreCompleto = fields[nameIdx]?.trim();
    const rawRol = fields[rolIdx]?.toUpperCase().trim();
    const cursoNombre = cursoIdx !== -1 ? fields[cursoIdx]?.trim() : null;
    
    const jornada = (jornadaIdx !== -1 && fields[jornadaIdx]?.trim()) || 'Mañana';
    
    const anoLectivoStr = anoLectivoIdx !== -1 ? fields[anoLectivoIdx]?.trim() : null;
    const anoLectivo = anoLectivoStr ? parseInt(anoLectivoStr, 10) : new Date().getFullYear();
    
    const cargaAcademica = cargaAcademicaIdx !== -1 ? fields[cargaAcademicaIdx]?.trim() : null;
    const emailEstudianteVinculado = emailEstudianteVinculadoIdx !== -1 ? fields[emailEstudianteVinculadoIdx]?.toLowerCase().trim() : null;
    const parentesco = (parentescoIdx !== -1 && fields[parentescoIdx]?.trim()) || 'Acudiente';

    if (!email || !nombreCompleto || !rawRol) {
      errorCount++;
      errors.push({
        row: i + 1,
        error: "Campos 'email', 'nombre_completo' y 'rol' son obligatorios.",
      });
      continue;
    }

    if (!VALID_BULK_ROLES.includes(rawRol as BulkRole)) {
      errorCount++;
      errors.push({
        row: i + 1,
        error: `Rol '${rawRol}' no es válido. Use: ${VALID_BULK_ROLES.join(', ')}.`,
      });
      continue;
    }

    // Evitar procesar duplicados dentro del mismo lote CSV
    if (uniqueRows.has(email)) continue;

    uniqueRows.set(email, {
      nombreCompleto,
      email,
      rawRol,
      cursoNombre,
      jornada,
      anoLectivo,
      cargaAcademica,
      emailEstudianteVinculado,
      parentesco,
      lineNum: i + 1
    });
  }

  const allEmails = Array.from(uniqueRows.keys());
  if (allEmails.length === 0) {
    return {
      success: true,
      successCount: 0,
      errorCount,
      errors,
    };
  }

  // 2. Pre-cargar Entidades en Lote (Pre-fetching)
  // Consultar usuarios existentes
  const { data: existingUsersData, error: usersFetchErr } = await adminClient
    .from('usuarios')
    .select('id_usuario, email, rol, id_institucion')
    .in('email', allEmails);

  if (usersFetchErr) {
    return { error: `Error al consultar usuarios existentes: ${usersFetchErr.message}` };
  }

  const existingUsersMap = new Map<string, { id_usuario: string; rol: string; id_institucion: string }>();
  if (existingUsersData) {
    for (const u of existingUsersData) {
      existingUsersMap.set(u.email.toLowerCase().trim(), {
        id_usuario: u.id_usuario,
        rol: u.rol,
        id_institucion: u.id_institucion
      });
    }
  }

  // Consultar todos los cursos de la institución
  const { data: existingCoursesData, error: coursesFetchErr } = await adminClient
    .from('cursos')
    .select('id_curso, nombre, jornada')
    .eq('id_institucion', idInstitucion);

  if (coursesFetchErr) {
    return { error: `Error al consultar cursos de la institución: ${coursesFetchErr.message}` };
  }

  const coursesMap = new Map<string, string>(); // "nombre-jornada" en minúsculas -> id_curso
  if (existingCoursesData) {
    for (const c of existingCoursesData) {
      coursesMap.set(`${c.nombre.toLowerCase().trim()}-${c.jornada.toLowerCase().trim()}`, c.id_curso);
    }
  }

  // Consultar todas las materias de la institución
  const { data: existingMateriasData, error: materiasFetchErr } = await adminClient
    .from('materias')
    .select('id_materia, nombre')
    .eq('id_institucion', idInstitucion);

  if (materiasFetchErr) {
    return { error: `Error al consultar materias de la institución: ${materiasFetchErr.message}` };
  }

  const materiasMap = new Map<string, string>(); // "nombre" en minúsculas -> id_materia
  if (existingMateriasData) {
    for (const m of existingMateriasData) {
      materiasMap.set(m.nombre.toLowerCase().trim(), m.id_materia);
    }
  }

  // 2.1 Verificar límites del plan de suscripción de la institución
  const { data: instData, error: instFetchErr } = await adminClient
    .from('instituciones')
    .select('id_suscripcion, estado_suscripcion, planes_suscripcion(nombre, limite_usuarios)')
    .eq('id_institucion', idInstitucion)
    .single();

  if (instFetchErr || !instData) {
    return { error: `Error al verificar la suscripción de la institución: ${instFetchErr?.message || 'No encontrada'}` };
  }

  const planLimit = (instData.planes_suscripcion as any)?.limite_usuarios ?? 50;
  const planNombre = (instData.planes_suscripcion as any)?.nombre || 'Plan Prueba';

  // Contar los usuarios actualmente registrados en la institución
  const { count: currentUsersCount, error: countErr } = await adminClient
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('id_institucion', idInstitucion);

  if (countErr) {
    return { error: `Error al verificar el número actual de usuarios: ${countErr.message}` };
  }

  // Calcular cuántos usuarios NUEVOS se crearían a partir del CSV
  let newUsersToCreateCount = 0;
  for (const email of uniqueRows.keys()) {
    if (!existingUsersMap.has(email)) {
      newUsersToCreateCount++;
    }
  }

  if ((currentUsersCount ?? 0) + newUsersToCreateCount > planLimit) {
    return {
      error: `Límite de plan superado. Tu plan (${planNombre}) permite un máximo de ${planLimit} usuarios. Actualmente tienes ${currentUsersCount ?? 0} registrados e intentas cargar ${newUsersToCreateCount} nuevos, superando el límite permitido.`,
    };
  }

  // Separar registros por roles
  const studentsList: UniqueRow[] = [];
  const teachersList: UniqueRow[] = [];
  const guardiansList: UniqueRow[] = [];

  for (const row of uniqueRows.values()) {
    if (row.rawRol === 'ESTUDIANTE') {
      studentsList.push(row);
    } else if (row.rawRol === 'DOCENTE') {
      teachersList.push(row);
    } else if (row.rawRol === 'ACUDIENTE') {
      guardiansList.push(row);
    }
  }

  // 3. Pre-creación de Cursos y Materias Faltantes
  const missingCoursesToCreate = new Map<string, { nombre: string; jornada: string }>();
  const missingMateriasToCreate = new Set<string>();

  // Analizar cursos necesarios para estudiantes
  for (const student of studentsList) {
    if (student.cursoNombre) {
      const name = student.cursoNombre.trim();
      const jor = student.jornada.trim();
      const key = `${name.toLowerCase()}-${jor.toLowerCase()}`;
      if (!coursesMap.has(key)) {
        missingCoursesToCreate.set(key, { nombre: name, jornada: jor });
      }
    }
  }

  // Analizar cursos y materias necesarias para docentes
  for (const teacher of teachersList) {
    const loadToParse = teacher.cargaAcademica || teacher.cursoNombre;
    if (!loadToParse) continue;
    const assignmentsList = loadToParse.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    for (const assignmentStr of assignmentsList) {
      let materiaNombre = '';
      let cursoNombreParsed = '';

      const match = assignmentStr.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);
      if (match) {
        materiaNombre = match[1].trim();
        cursoNombreParsed = match[2].trim();
      } else {
        const parts = assignmentStr.split('-');
        if (parts.length >= 2) {
          cursoNombreParsed = parts[parts.length - 1].trim();
          materiaNombre = parts.slice(0, parts.length - 1).join('-').trim();
        }
      }

      if (materiaNombre) {
        const matKey = materiaNombre.toLowerCase().trim();
        if (!materiasMap.has(matKey)) {
          missingMateriasToCreate.add(materiaNombre.trim());
        }
      }

      if (cursoNombreParsed) {
        const curKey = `${cursoNombreParsed.toLowerCase().trim()}-${teacher.jornada.toLowerCase().trim()}`;
        if (!coursesMap.has(curKey)) {
          // Si el curso ya existe en otra jornada, preferimos no duplicarlo
          let existingCourseId: string | undefined;
          if (existingCoursesData) {
            const found = existingCoursesData.find(c => c.nombre.toLowerCase().trim() === cursoNombreParsed.toLowerCase().trim());
            if (found) {
              existingCourseId = found.id_curso;
            }
          }
          if (!existingCourseId) {
            missingCoursesToCreate.set(curKey, { nombre: cursoNombreParsed, jornada: teacher.jornada });
          }
        }
      }
    }
  }

  // Crear cursos faltantes en lote
  if (missingCoursesToCreate.size > 0) {
    const { data: insertedCourses, error: courseInsertErr } = await adminClient
      .from('cursos')
      .insert(
        Array.from(missingCoursesToCreate.values()).map(c => ({
          id_institucion: idInstitucion,
          nombre: c.nombre,
          jornada: c.jornada
        }))
      )
      .select('id_curso, nombre, jornada');

    if (courseInsertErr) {
      return { error: `Error al crear cursos faltantes en lote: ${courseInsertErr.message}` };
    }

    if (insertedCourses) {
      for (const c of insertedCourses) {
        coursesMap.set(`${c.nombre.toLowerCase().trim()}-${c.jornada.toLowerCase().trim()}`, c.id_curso);
      }
    }
  }

  // Crear materias faltantes en lote
  if (missingMateriasToCreate.size > 0) {
    const { data: insertedMaterias, error: materiaInsertErr } = await adminClient
      .from('materias')
      .insert(
        Array.from(missingMateriasToCreate).map(m => ({
          id_institucion: idInstitucion,
          nombre: m,
          area: 'General'
        }))
      )
      .select('id_materia, nombre');

    if (materiaInsertErr) {
      return { error: `Error al crear materias faltantes en lote: ${materiaInsertErr.message}` };
    }

    if (insertedMaterias) {
      for (const m of insertedMaterias) {
        materiasMap.set(m.nombre.toLowerCase().trim(), m.id_materia);
      }
    }
  }

  // 4. Mapear Estudiantes a sus IDs para vinculación rápida de acudientes
  const studentEmailsMap = new Map<string, string>(); // email -> id_usuario
  for (const [email, u] of existingUsersMap.entries()) {
    if (u.rol === 'ESTUDIANTE') {
      studentEmailsMap.set(email, u.id_usuario);
    }
  }

  // 5. Helper local para creación segura de Auth + Perfil público
  const createSingleUser = async (row: UniqueRow, role: BulkRole) => {
    const { email, nombreCompleto } = row;
    const existing = existingUsersMap.get(email);
    let userId = existing?.id_usuario || null;
    let isNewUser = false;
    let createdAuthUserId: string | null = null;
    let createdPublicUser = false;

    try {
      if (existing && existing.id_institucion !== idInstitucion) {
        throw new Error('El correo electrónico ya está registrado en otra institución.');
      }

      if (!userId) {
        isNewUser = true;
        const tempPassword = 'Sophos2026!';

        // Paso A: Crear Auth
        const { data: newAuthData, error: authErr } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          app_metadata: {
            id_institucion: idInstitucion,
            rol: role,
            must_change_password: true,
          },
          user_metadata: {
            nombre_completo: nombreCompleto,
          },
        });

        if (authErr || !newAuthData.user) {
          throw new Error(
            `Error en Supabase Auth: ${
              authErr?.message?.includes('already registered')
                ? 'El email ya está registrado.'
                : authErr?.message || 'No se pudo registrar en Auth.'
            }`
          );
        }

        userId = newAuthData.user.id;
        createdAuthUserId = userId;

        // Paso B: Insertar perfil público
        const { error: userErr } = await adminClient.from('usuarios').insert({
          id_usuario: userId,
          email,
          nombre_completo: nombreCompleto,
          rol: role,
          id_institucion: idInstitucion,
        });

        if (userErr) {
          throw new Error(`Error al crear perfil en tabla usuarios: ${userErr.message}`);
        }
        createdPublicUser = true;

        existingUsersMap.set(email, { id_usuario: userId, rol: role, id_institucion: idInstitucion });
      } else if (existing?.rol !== role) {
        throw new Error(`El usuario ya está registrado en la base de datos con un rol diferente (${existing?.rol}).`);
      }

      return { userId, isNewUser, success: true };
    } catch (err) {
      // Rollback manual
      if (isNewUser && createdAuthUserId) {
        try {
          if (createdPublicUser) {
            await adminClient.from('usuarios').delete().eq('id_usuario', createdAuthUserId);
          }
          await adminClient.auth.admin.deleteUser(createdAuthUserId);
          console.log(`[Rollback] Limpieza exitosa para ${email}`);
        } catch (rollbackErr) {
          console.error(`[Rollback Fallido] Error al revertir usuario ${email}:`, rollbackErr);
        }
      }

      return {
        userId: null,
        isNewUser,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  // 6. FASE I: Procesar Estudiantes
  const { data: existingMatriculasData } = await adminClient
    .from('estudiantes_matriculados')
    .select('id_matricula, id_estudiante, id_curso, ano_lectivo')
    .eq('id_institucion', idInstitucion);

  const matriculasMap = new Map<string, { id_matricula: string; id_curso: string }>(); // key: "id_estudiante-ano_lectivo"
  if (existingMatriculasData) {
    for (const m of existingMatriculasData) {
      matriculasMap.set(`${m.id_estudiante}-${m.ano_lectivo}`, {
        id_matricula: m.id_matricula,
        id_curso: m.id_curso
      });
    }
  }

  const matriculasToInsert: {
    id_estudiante: string;
    id_curso: string;
    id_institucion: string;
    ano_lectivo: number;
  }[] = [];

  await runInChunks(studentsList, 10, async (student) => {
    const res = await createSingleUser(student, 'ESTUDIANTE');
    if (!res.success || !res.userId) {
      errorCount++;
      errors.push({ row: student.lineNum, error: res.error || 'Fallo al procesar estudiante.' });
      return;
    }

    studentEmailsMap.set(student.email, res.userId);

    if (student.cursoNombre) {
      const curKey = `${student.cursoNombre.toLowerCase().trim()}-${student.jornada.toLowerCase().trim()}`;
      const cursoId = coursesMap.get(curKey);
      if (!cursoId) {
        errorCount++;
        errors.push({ row: student.lineNum, error: `No se pudo resolver el curso '${student.cursoNombre}'.` });
        return;
      }

      const matKey = `${res.userId}-${student.anoLectivo}`;
      const existingMat = matriculasMap.get(matKey);

      if (!existingMat) {
        matriculasToInsert.push({
          id_estudiante: res.userId,
          id_curso: cursoId,
          id_institucion: idInstitucion,
          ano_lectivo: student.anoLectivo
        });
        matriculasMap.set(matKey, { id_matricula: 'temp', id_curso: cursoId });
      } else if (existingMat.id_curso !== cursoId) {
        // Actualizar matrícula si el curso cambió
        const { error: updateErr } = await adminClient
          .from('estudiantes_matriculados')
          .update({ id_curso: cursoId })
          .eq('id_matricula', existingMat.id_matricula);
        
        if (updateErr) {
          console.error(`Error actualizando matrícula para ${student.email}:`, updateErr);
        } else {
          existingMat.id_curso = cursoId;
        }
      }
    }
    successCount++;
  });

  // Insertar matrículas de Estudiantes en lote
  if (matriculasToInsert.length > 0) {
    const { error: matErr } = await adminClient
      .from('estudiantes_matriculados')
      .insert(matriculasToInsert);
    if (matErr) {
      console.error('Error insertando matrículas en lote:', matErr);
      errors.push({ row: 0, error: `Error al registrar matrículas en lote: ${matErr.message}` });
    }
  }

  // 7. FASE II: Procesar Docentes
  const { data: existingAsignacionesData } = await adminClient
    .from('asignaciones_academicas')
    .select('id_docente, id_materia, id_curso, ano_lectivo')
    .eq('id_institucion', idInstitucion);

  const asignacionesSet = new Set<string>();
  if (existingAsignacionesData) {
    for (const a of existingAsignacionesData) {
      asignacionesSet.add(`${a.id_docente}-${a.id_materia}-${a.id_curso}-${a.ano_lectivo}`);
    }
  }

  const asignacionesToInsert: {
    id_docente: string;
    id_materia: string;
    id_curso: string;
    id_institucion: string;
    ano_lectivo: number;
  }[] = [];

  await runInChunks(teachersList, 10, async (teacher) => {
    const res = await createSingleUser(teacher, 'DOCENTE');
    if (!res.success || !res.userId) {
      errorCount++;
      errors.push({ row: teacher.lineNum, error: res.error || 'Fallo al procesar docente.' });
      return;
    }

    const loadToParse = teacher.cargaAcademica || teacher.cursoNombre;
    if (loadToParse) {
      const assignmentsList = loadToParse.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      for (const assignmentStr of assignmentsList) {
        let materiaNombre = '';
        let cursoNombreParsed = '';

        const match = assignmentStr.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);
        if (match) {
          materiaNombre = match[1].trim();
          cursoNombreParsed = match[2].trim();
        } else {
          const parts = assignmentStr.split('-');
          if (parts.length >= 2) {
            cursoNombreParsed = parts[parts.length - 1].trim();
            materiaNombre = parts.slice(0, parts.length - 1).join('-').trim();
          }
        }

        if (materiaNombre && cursoNombreParsed) {
          const matId = materiasMap.get(materiaNombre.toLowerCase().trim());
          let cursoId = coursesMap.get(`${cursoNombreParsed.toLowerCase().trim()}-${teacher.jornada.toLowerCase().trim()}`);
          if (!cursoId && existingCoursesData) {
            // fallback: buscar curso por nombre general
            const found = existingCoursesData.find(c => c.nombre.toLowerCase().trim() === cursoNombreParsed.toLowerCase().trim());
            if (found) cursoId = found.id_curso;
          }

          if (!matId || !cursoId) {
            errorCount++;
            errors.push({
              row: teacher.lineNum,
              error: `No se pudo asociar la asignatura '${assignmentStr}' porque no existe la materia o el curso.`,
            });
            continue;
          }

          const assignKey = `${res.userId}-${matId}-${cursoId}-${teacher.anoLectivo}`;
          if (!asignacionesSet.has(assignKey)) {
            asignacionesToInsert.push({
              id_docente: res.userId,
              id_materia: matId,
              id_curso: cursoId,
              id_institucion: idInstitucion,
              ano_lectivo: teacher.anoLectivo
            });
            asignacionesSet.add(assignKey);
          }
        }
      }
    }
    successCount++;
  });

  // Insertar asignaciones de Docentes en lote
  if (asignacionesToInsert.length > 0) {
    const { error: assignErr } = await adminClient
      .from('asignaciones_academicas')
      .insert(asignacionesToInsert);
    if (assignErr) {
      console.error('Error insertando asignaciones en lote:', assignErr);
      errors.push({ row: 0, error: `Error al registrar asignaciones académicas en lote: ${assignErr.message}` });
    }
  }

  // 8. FASE III: Procesar Acudientes
  const { data: existingRelationsData } = await adminClient
    .from('perfiles_acudientes_estudiantes')
    .select('id_acudiente, id_estudiante')
    .eq('id_institucion', idInstitucion);

  const relationsSet = new Set<string>();
  if (existingRelationsData) {
    for (const r of existingRelationsData) {
      relationsSet.add(`${r.id_acudiente}-${r.id_estudiante}`);
    }
  }

  const relationsToInsert: {
    id_acudiente: string;
    id_estudiante: string;
    id_institucion: string;
    parentesco: string;
  }[] = [];

  await runInChunks(guardiansList, 10, async (guardian) => {
    if (!guardian.emailEstudianteVinculado) {
      errorCount++;
      errors.push({ row: guardian.lineNum, error: "El campo 'email_estudiante_vinculado' es obligatorio para acudientes." });
      return;
    }

    const studentId = studentEmailsMap.get(guardian.emailEstudianteVinculado.toLowerCase().trim());
    if (!studentId) {
      errorCount++;
      errors.push({
        row: guardian.lineNum,
        error: `No se pudo encontrar al estudiante vinculado con correo '${guardian.emailEstudianteVinculado}' en esta institución.`,
      });
      return;
    }

    const res = await createSingleUser(guardian, 'ACUDIENTE');
    if (!res.success || !res.userId) {
      errorCount++;
      errors.push({ row: guardian.lineNum, error: res.error || 'Fallo al procesar acudiente.' });
      return;
    }

    const relationKey = `${res.userId}-${studentId}`;
    if (!relationsSet.has(relationKey)) {
      relationsToInsert.push({
        id_acudiente: res.userId,
        id_estudiante: studentId,
        id_institucion: idInstitucion,
        parentesco: guardian.parentesco
      });
      relationsSet.add(relationKey);
    }
    successCount++;
  });

  // Insertar vínculos de Acudientes en lote
  if (relationsToInsert.length > 0) {
    const { error: relErr } = await adminClient
      .from('perfiles_acudientes_estudiantes')
      .insert(relationsToInsert);
    if (relErr) {
      console.error('Error insertando vínculos de acudientes en lote:', relErr);
      errors.push({ row: 0, error: `Error al registrar vínculos de acudientes en lote: ${relErr.message}` });
    }
  }

  // Ordenar errores por número de fila para que se presenten ordenadamente en la UI
  errors.sort((a, b) => a.row - b.row);

  return {
    success: true,
    successCount,
    errorCount,
    errors,
  };
}
