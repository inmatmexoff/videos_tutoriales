// Utilidades para construir claves ("keys") válidas para Supabase Storage.
//
// Supabase Storage rechaza claves con caracteres no-ASCII (Ñ, tildes, etc.),
// varios símbolos y otros caracteres "raros", devolviendo "Invalid key". El
// usuario, sin embargo, escribe nombres de categorías, módulos y archivos con
// espacios, acentos y la Ñ. Estas funciones transliteran y limpian esos nombres
// para que SIEMPRE generen una clave válida, sin bloquear el guardado.
//
// Importante: solo se sanea la RUTA dentro del bucket. El nombre "bonito" del
// archivo se conserva aparte (columna `nombre`), así que el usuario sigue viendo
// su texto original con acentos y espacios.

// Quita los diacríticos (tildes, diéresis) y convierte Ñ→N, ñ→n, etc.
function quitarAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // marcas de acento combinadas
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');
}

// Sanea un único segmento de la ruta (categoría, módulo o nombre de archivo).
// Conserva letras, números, punto, guion y guion bajo; el resto se vuelve "_".
// Nunca devuelve cadena vacía para no romper la ruta.
export function sanitizeKeySegment(nombre: string, fallback = 'sin_nombre'): string {
  const limpio = quitarAcentos(nombre)
    .replace(/[^a-zA-Z0-9._-]+/g, '_') // cualquier cosa rara → "_"
    .replace(/_+/g, '_')               // colapsa "___" en "_"
    .replace(/^[_.]+|[_.]+$/g, '');    // sin "_" ni "." al inicio/fin

  return limpio || fallback;
}

// Sanea el nombre de un archivo preservando su extensión.
export function sanitizeFileName(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  if (punto <= 0 || punto === nombre.length - 1) {
    return sanitizeKeySegment(nombre, 'archivo');
  }
  const base = sanitizeKeySegment(nombre.slice(0, punto), 'archivo');
  const ext = sanitizeKeySegment(nombre.slice(punto + 1), 'bin');
  return `${base}.${ext}`;
}
