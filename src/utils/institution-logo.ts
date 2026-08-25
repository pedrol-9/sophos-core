/**
 * Genera o retorna la URL pública del logotipo institucional.
 * Si la institución tiene una `logo_url` explícita guardada, la utiliza.
 * De lo contrario, construye la URL estándar hacia el bucket `logos` de Supabase Storage.
 * Si no se proporciona un ID institucional, retorna el favicon por defecto.
 */
export function getInstitutionLogoUrl(
  idInstitucion?: string | null,
  customLogoUrl?: string | null
): string {
  if (customLogoUrl) {
    return customLogoUrl;
  }

  if (!idInstitucion) {
    return '/favicon.png';
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/logos/${idInstitucion}/logo.png`;
}
