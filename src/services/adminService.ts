import { createAdminClient } from '@/utils/supabase/admin';

export type BulkImportResult = {
  error?: string;
  success?: boolean;
  successCount?: number;
  errorCount?: number;
  errors?: string[];
};

const VALID_BULK_ROLES = ['DOCENTE', 'ESTUDIANTE', 'ACUDIENTE'] as const;
type BulkRole = (typeof VALID_BULK_ROLES)[number];

export async function processBulkImport(
  lines: string[],
  idInstitucion: string
): Promise<BulkImportResult> {
  const adminClient = createAdminClient();

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('nombre_completo');
  const rolIdx = headers.indexOf('rol');
  const cursoIdx = headers.indexOf('curso');

  if (emailIdx === -1 || nameIdx === -1 || rolIdx === -1) {
    return {
      error:
        'El archivo CSV debe contener las columnas: nombre_completo, email, rol. La columna "curso" es opcional.',
    };
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const uniqueRows = new Map<string, {
    nombreCompleto: string;
    email: string;
    rawRol: string;
    cursoNombre: string | null;
    lineNum: number;
  }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((f) => f.trim().replace(/"/g, ''));

    const email = fields[emailIdx]?.toLowerCase().trim();
    const nombreCompleto = fields[nameIdx]?.trim();
    const rawRol = fields[rolIdx]?.toUpperCase().trim();
    const cursoNombre = cursoIdx !== -1 ? fields[cursoIdx]?.trim() : null;

    if (!email || !nombreCompleto || !rawRol) {
      errorCount++;
      errors.push(`Fila ${i + 1}: Campos 'email', 'nombre_completo' y 'rol' son obligatorios.`);
      continue;
    }

    if (!VALID_BULK_ROLES.includes(rawRol as BulkRole)) {
      errorCount++;
      errors.push(
        `Fila ${i + 1} (${email}): Rol '${rawRol}' no es válido. Use: ${VALID_BULK_ROLES.join(', ')}.`
      );
      continue;
    }

    if (uniqueRows.has(email)) continue;

    uniqueRows.set(email, {
      nombreCompleto,
      email,
      rawRol,
      cursoNombre,
      lineNum: i + 1
    });
  }

  for (const [email, row] of uniqueRows.entries()) {
    const { nombreCompleto, rawRol, cursoNombre, lineNum } = row;
    const currentYear = new Date().getFullYear();

    const { data: existingUser, error: checkError } = await adminClient
      .from('usuarios')
      .select('id_usuario')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      errorCount++;
      errors.push(`Fila ${lineNum} (${email}): Error al verificar existencia: ${checkError.message}`);
      continue;
    }

    let userId = existingUser?.id_usuario || null;
    let isNewUser = false;

    if (!userId) {
      const tempPassword = 'Sophos2026!';
      const { data: newAuthData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: {
          id_institucion: idInstitucion,
          rol: rawRol,
          must_change_password: true,
        },
        user_metadata: {
          nombre_completo: nombreCompleto,
        },
      });

      if (authErr || !newAuthData.user) {
        errorCount++;
        errors.push(
          `Fila ${lineNum} (${email}): ${
            authErr?.message?.includes('already registered')
              ? 'El email ya está registrado.'
              : authErr?.message
          }`
        );
        continue;
      }

      userId = newAuthData.user.id;
      isNewUser = true;

      const { error: userErr } = await adminClient.from('usuarios').insert({
        id_usuario: userId,
        email,
        nombre_completo: nombreCompleto,
        rol: rawRol as BulkRole,
        id_institucion: idInstitucion,
      });

      if (userErr) {
        await adminClient.auth.admin.deleteUser(userId);
        errorCount++;
        errors.push(`Fila ${lineNum} (${email}): Error al crear perfil público: ${userErr.message}`);
        continue;
      }
    }

    if (rawRol === 'ESTUDIANTE' && cursoNombre) {
      let { data: curso } = await adminClient
        .from('cursos')
        .select('id_curso')
        .eq('id_institucion', idInstitucion)
        .eq('nombre', cursoNombre)
        .maybeSingle();

      if (!curso) {
        const { data: newCurso, error: newCursoErr } = await adminClient
          .from('cursos')
          .insert({
            id_institucion: idInstitucion,
            nombre: cursoNombre,
            jornada: 'Mañana',
          })
          .select('id_curso')
          .single();

        if (newCursoErr) {
          errors.push(
            `Fila ${lineNum} (${email}): No se pudo crear el curso '${cursoNombre}': ${newCursoErr.message}`
          );
          if (isNewUser) successCount++;
          continue;
        }
        curso = newCurso;
      }

      const { data: matriculaExistente } = await adminClient
        .from('estudiantes_matriculados')
        .select('id_matricula')
        .eq('id_estudiante', userId)
        .eq('id_curso', curso.id_curso)
        .eq('ano_lectivo', currentYear)
        .maybeSingle();

      if (!matriculaExistente) {
        const { error: matriculaErr } = await adminClient.from('estudiantes_matriculados').insert({
          id_estudiante: userId,
          id_curso: curso.id_curso,
          id_institucion: idInstitucion,
          ano_lectivo: currentYear,
        });

        if (matriculaErr) {
          errors.push(
            `Fila ${lineNum} (${email}): Perfil listo, pero no se pudo matricular en '${cursoNombre}': ${matriculaErr.message}`
          );
        }
      }
    } else if (rawRol === 'DOCENTE' && cursoNombre) {
      const assignmentsList = cursoNombre.split(';').map((x) => x.trim()).filter(Boolean);

      for (const assignmentStr of assignmentsList) {
        let materiaNombre = "";
        let cursoNombreParsed = "";

        const match = assignmentStr.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);

        if (match) {
          materiaNombre = match[1].trim();
          cursoNombreParsed = match[2].trim();
        } else {
          const parts = assignmentStr.split('-');
          if (parts.length < 2) {
            errors.push(
              `Fila ${lineNum} (${email}): Formato de asignatura '${assignmentStr}' no es válido. Use: 'Materia-Curso'.`
            );
            continue;
          }
          cursoNombreParsed = parts[parts.length - 1].trim();
          materiaNombre = parts.slice(0, parts.length - 1).join('-').trim();
        }

        if (!materiaNombre || !cursoNombreParsed) {
          errors.push(`Fila ${lineNum} (${email}): Materia o curso vacíos en '${assignmentStr}'.`);
          continue;
        }

        let { data: curso } = await adminClient
          .from('cursos')
          .select('id_curso')
          .eq('id_institucion', idInstitucion)
          .eq('nombre', cursoNombreParsed)
          .maybeSingle();

        if (!curso) {
          const { data: newCurso, error: newCursoErr } = await adminClient
            .from('cursos')
            .insert({
              id_institucion: idInstitucion,
              nombre: cursoNombreParsed,
              jornada: 'Mañana',
            })
            .select('id_curso')
            .single();

          if (newCursoErr) {
            errors.push(
              `Fila ${lineNum} (${email}): No se pudo crear el curso '${cursoNombreParsed}': ${newCursoErr.message}`
            );
            continue;
          }
          curso = newCurso;
        }

        let { data: materia } = await adminClient
          .from('materias')
          .select('id_materia')
          .eq('id_institucion', idInstitucion)
          .eq('nombre', materiaNombre)
          .maybeSingle();

        if (!materia) {
          const { data: newMateria, error: newMateriaErr } = await adminClient
            .from('materias')
            .insert({
              id_institucion: idInstitucion,
              nombre: materiaNombre,
              area: 'General',
            })
            .select('id_materia')
            .single();

          if (newMateriaErr) {
            errors.push(
              `Fila ${lineNum} (${email}): No se pudo crear la materia '${materiaNombre}': ${newMateriaErr.message}`
            );
            continue;
          }
          materia = newMateria;
        }

        const { data: asignacionExistente } = await adminClient
          .from('asignaciones_academicas')
          .select('id_asignacion')
          .eq('id_docente', userId)
          .eq('id_materia', materia.id_materia)
          .eq('id_curso', curso.id_curso)
          .eq('ano_lectivo', currentYear)
          .maybeSingle();

        if (!asignacionExistente) {
          const { error: assignErr } = await adminClient.from('asignaciones_academicas').insert({
            id_docente: userId,
            id_materia: materia.id_materia,
            id_curso: curso.id_curso,
            id_institucion: idInstitucion,
            ano_lectivo: currentYear,
          });

          if (assignErr) {
            errors.push(
              `Fila ${lineNum} (${email}): No se pudo asignar '${materiaNombre}' en '${cursoNombreParsed}': ${assignErr.message}`
            );
          }
        }
      }
    }

    if (isNewUser) {
      successCount++;
    }
  }

  return {
    success: true,
    successCount,
    errorCount,
    errors,
  };
}
