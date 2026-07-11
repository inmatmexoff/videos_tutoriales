// La columna `enlaces_sistemas` en `tutoriales` es jsonb: un arreglo de
// { nombre, url } con los links a los sistemas/plataformas externas que hay
// que usar en ese video (ej. la plataforma de ML y luego una web propia).
// Mismo patron defensivo que normalizeChecklist: si la columna llegara como
// texto en vez de jsonb ya deserializado, lo normalizamos igual.

export interface EnlaceSistema {
  nombre: string;
  url: string;
}

export function normalizeEnlaces(raw: unknown): EnlaceSistema[] {
  const toEnlaces = (value: unknown): EnlaceSistema[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is EnlaceSistema =>
      !!item && typeof item === 'object' && typeof (item as any).nombre === 'string' && typeof (item as any).url === 'string'
    );
  };

  if (Array.isArray(raw)) return toEnlaces(raw);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return toEnlaces(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function ensureUrlProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
