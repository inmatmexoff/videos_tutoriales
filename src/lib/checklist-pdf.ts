import jsPDF from 'jspdf';

// La columna `checklist` deberia ser jsonb (arreglo nativo), pero si la
// columna quedo como texto, Supabase-js devuelve el string tal cual en vez
// de deserializarlo. Esto lo normaliza a un arreglo en cualquiera de los casos.
export function normalizeChecklist(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      // no era JSON valido: lo tratamos como una lista separada por saltos de linea
      return raw.split('\n').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function downloadChecklistPdf(titulo: string, items: string[]) {
  const doc = new jsPDF();
  const marginX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2 - 10; // deja espacio para la casilla
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(titulo, pageWidth - marginX * 2);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 8 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Checklist', marginX, y);
  doc.setTextColor(0);
  y += 10;

  doc.setFontSize(12);

  items.forEach(item => {
    const lines = doc.splitTextToSize(item, maxWidth);
    const blockHeight = lines.length * 7 + 4;

    if (y + blockHeight > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }

    doc.rect(marginX, y - 4, 5, 5);
    doc.text(lines, marginX + 9, y);
    y += blockHeight;
  });

  const safeName = titulo.replace(/[^a-z0-9]+/gi, '_').toLowerCase().replace(/^_+|_+$/g, '');
  doc.save(`checklist_${safeName || 'proceso'}.pdf`);
}
