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

// Extensiones que se aceptan como documento adjunto.
// HEIC/HEIF están aquí solo por si iOS entrega el original: al incluir
// "image/*" en el accept, Safari normalmente convierte las fotos de la
// Fototeca a JPEG antes de entregarlas.
export const DOCUMENT_EXTENSIONS = [
  'pdf', 'txt', 'csv',
  ...OFFICE_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  'heic', 'heif',
];

// Valor del atributo `accept` del <input type="file">.
//
// Lleva MIME types ADEMÁS de las extensiones a propósito: iPadOS filtra el
// selector nativo traduciendo cada extensión a un UTI, y con archivos que
// llegan de apps de terceros (Drive, OneDrive) esa traducción falla y el
// archivo sale atenuado, sin poder tocarlo y sin ninguna explicación. Con el
// MIME type declarado, el selector los reconoce. "image/*" es lo que permite
// adjuntar desde la Fototeca del iPad.
export const DOCUMENT_ACCEPT = [
  'application/pdf',
  'image/*',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  ...DOCUMENT_EXTENSIONS.map(ext => `.${ext}`),
].join(',');

// El `accept` es solo un filtro del selector: en iPad y en escritorio se puede
// esquivar (arrastrando, o eligiendo "todos los archivos"). Esta validación es
// la que sí manda, y permite explicar el motivo en pantalla.
export function isAllowedDocument(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return DOCUMENT_EXTENSIONS.includes(ext);
}
