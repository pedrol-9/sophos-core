export function extractGrado(nombreCurso: string): string {
  if (!nombreCurso) return '';
  const str = nombreCurso.trim();
  const lower = str.toLowerCase();

  if (lower.includes('primero') || lower.includes('1°') || lower.includes('1ro')) return '1';
  if (lower.includes('segundo') || lower.includes('2°') || lower.includes('2do')) return '2';
  if (lower.includes('tercero') || lower.includes('3°') || lower.includes('3ro')) return '3';
  if (lower.includes('cuarto') || lower.includes('4°') || lower.includes('4to')) return '4';
  if (lower.includes('quinto') || lower.includes('5°') || lower.includes('5to')) return '5';
  if (lower.includes('sexto') || lower.includes('6°') || lower.includes('6to')) return '6';
  if (lower.includes('séptimo') || lower.includes('septimo') || lower.includes('7°') || lower.includes('7mo')) return '7';
  if (lower.includes('octavo') || lower.includes('8°') || lower.includes('8vo')) return '8';
  if (lower.includes('noveno') || lower.includes('9°') || lower.includes('9no')) return '9';
  if (lower.includes('décimo') || lower.includes('decimo') || lower.includes('10°')) return '10';
  if (lower.includes('undécimo') || lower.includes('undecimo') || lower.includes('once') || lower.includes('11°')) return '11';

  const match = str.match(/(\d+)/);
  if (match) {
    const num = match[1];
    if (num.length >= 3) {
      return num.slice(0, -2);
    }
    return num;
  }
  return str;
}
