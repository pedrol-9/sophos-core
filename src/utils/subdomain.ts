import { headers, cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface InstitutionContext {
  id_institucion: string;
  nombre_legal: string;
  subdominio: string;
  subdominio_bloqueado: boolean;
  dominio_personalizado: string | null;
  logo_url: string | null;
}

/**
 * Obtiene el subdominio activo de la solicitud actual (desde headers o cookies).
 */
export async function getActiveSubdomain(): Promise<string | null> {
  const reqHeaders = await headers();
  const subdomainHeader = reqHeaders.get('x-subdomain');
  if (subdomainHeader) return subdomainHeader;

  const cookieStore = await cookies();
  const subdomainCookie = cookieStore.get('sophos_subdomain')?.value;
  return subdomainCookie || null;
}

/**
 * Resuelve la información básica de la institución correspondiente al subdominio activo.
 */
export async function getActiveInstitution(): Promise<InstitutionContext | null> {
  const subdominio = await getActiveSubdomain();
  if (!subdominio) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('instituciones')
      .select('id_institucion, nombre_legal, subdominio, subdominio_bloqueado, dominio_personalizado, logo_url')
      .eq('subdominio', subdominio)
      .maybeSingle();

    if (error || !data) return null;
    return data as InstitutionContext;
  } catch {
    return null;
  }
}
