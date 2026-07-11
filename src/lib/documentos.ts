// La columna `documentos` en `tutoriales` es jsonb: un arreglo de { nombre, path }.
// `path` es la ruta del objeto dentro del bucket privado "documentos-tutoriales"
// (no una URL pública, porque el bucket no es público). Para mostrar o descargar
// un documento hay que generar una signed URL temporal con createSignedUrl(s).
// Supabase-js serializa/deserializa el jsonb automáticamente.

export interface DocumentoRef {
  nombre: string;
  path: string;
}

export const DOCUMENTOS_BUCKET = 'documentos-tutoriales';
export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

export const MAX_DOCUMENT_SIZE_MB = 20;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type DocumentPreviewKind = 'pdf' | 'image' | 'office' | 'other';

const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export function getDocumentPreviewKind(nombre: string): DocumentPreviewKind {
  const ext = nombre.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (OFFICE_EXTENSIONS.includes(ext)) return 'office';
  return 'other';
}
