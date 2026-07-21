"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Library,
  Plus,
  Search,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File as FileIcon,
  FileCode2,
  Download,
  Trash2,
  Loader2,
  Save,
  Paperclip,
  X,
  Tag,
  Layers,
  Eye,
  ExternalLink,
  PlusCircle,
  Check,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AdminGuard } from "@/components/admin-guard";
import { MAX_DOCUMENT_SIZE_MB, formatFileSize, getDocumentPreviewKind } from "@/lib/documentos";
import { Etiqueta, fetchEtiquetasDeModulo, vincularEtiquetaAModulo } from "@/lib/etiquetas";
import {
  BibliotecaDoc,
  TipoBiblioteca,
  detectarTipo,
  esArchivoSensible,
  fetchBibliotecaDocs,
  subirArchivoBiblioteca,
  crearBibliotecaDoc,
  getBibliotecaSignedUrl,
  eliminarBibliotecaDoc,
} from "@/lib/biblioteca";

const SIN_MODULO = "__sin_modulo__";
const SIN_ETIQUETA = "__sin_etiqueta__";
const CREAR_NUEVO = "__crear_nuevo__";

type CampoTaxonomia = 'categoria' | 'modulo' | 'etiqueta';

function iconoPorArchivo(nombre: string, tipo?: TipoBiblioteca) {
  if (tipo === 'codigo') return FileCode2;
  switch (getDocumentPreviewKind(nombre)) {
    case 'pdf': return FileText;
    case 'image': return ImageIcon;
    case 'office': return FileSpreadsheet;
    default: return FileIcon;
  }
}

export default function BibliotecaPage() {
  return (
    <AdminGuard>
      <BibliotecaContent />
    </AdminGuard>
  );
}

function BibliotecaContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [docs, setDocs] = useState<BibliotecaDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros del listado
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoBiblioteca>('todos');
  const [filtroModulo, setFiltroModulo] = useState("all");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("all");

  // Diálogo de carga
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [archivoSensible, setArchivoSensible] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", categoriaId: "", moduloId: "", etiquetaId: "", tipo: 'documento' as TipoBiblioteca });

  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [modulos, setModulos] = useState<{ id: number; nombre: string }[]>([]);
  const [etiquetasForm, setEtiquetasForm] = useState<Etiqueta[]>([]);

  // Borrado
  const [docAEliminar, setDocAEliminar] = useState<BibliotecaDoc | null>(null);

  // Vista previa
  const [previewDoc, setPreviewDoc] = useState<BibliotecaDoc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Creación inline de categoría/módulo/etiqueta desde el modal de carga
  const [creando, setCreando] = useState<CampoTaxonomia | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [creandoLoading, setCreandoLoading] = useState(false);

  const cargarDocs = async () => {
    try {
      setLoading(true);
      setDocs(await fetchBibliotecaDocs());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la biblioteca." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDocs();
    supabasePROD
      .from('categorias_tutoriales')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => setCategorias(data || []));
  }, []);

  // Módulos según la categoría elegida en el formulario de carga
  useEffect(() => {
    if (!form.categoriaId) { setModulos([]); return; }
    supabasePROD
      .from('modulos_tutoriales')
      .select('id, nombre')
      .eq('categoria_id', form.categoriaId)
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => setModulos(data || []));
  }, [form.categoriaId]);

  // Etiquetas según el módulo elegido en el formulario de carga
  useEffect(() => {
    if (!form.moduloId) { setEtiquetasForm([]); return; }
    fetchEtiquetasDeModulo(form.moduloId).then(setEtiquetasForm).catch(() => setEtiquetasForm([]));
  }, [form.moduloId]);

  // Opciones de los filtros, derivadas de los documentos ya cargados
  const modulosDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    docs.forEach(d => { if (d.modulo_id && d.modulo) map.set(d.modulo_id, d.modulo.nombre); });
    return Array.from(map, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [docs]);

  const etiquetasDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    docs.forEach(d => { if (d.etiqueta_id && d.etiqueta) map.set(d.etiqueta_id, d.etiqueta.nombre); });
    return Array.from(map, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [docs]);

  const docsFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(d => {
      if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false;
      if (q && !`${d.titulo} ${d.descripcion || ""} ${d.nombre_archivo}`.toLowerCase().includes(q)) return false;
      if (filtroModulo !== "all") {
        if (filtroModulo === SIN_MODULO ? d.modulo_id !== null : d.modulo_id?.toString() !== filtroModulo) return false;
      }
      if (filtroEtiqueta !== "all") {
        if (filtroEtiqueta === SIN_ETIQUETA ? d.etiqueta_id !== null : d.etiqueta_id?.toString() !== filtroEtiqueta) return false;
      }
      return true;
    });
  }, [docs, search, filtroTipo, filtroModulo, filtroEtiqueta]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size / (1024 * 1024) > MAX_DOCUMENT_SIZE_MB) {
      toast({ variant: "destructive", title: "Archivo demasiado grande", description: `"${f.name}" supera el límite de ${MAX_DOCUMENT_SIZE_MB}MB.` });
      e.target.value = "";
      return;
    }
    setFile(f);
    setArchivoSensible(esArchivoSensible(f.name));
    // Autodetecta el tipo por extensión (editable) y, si no hay título aún,
    // precarga con el nombre del archivo sin extensión.
    setForm(prev => ({
      ...prev,
      tipo: detectarTipo(f.name),
      titulo: prev.titulo || f.name.replace(/\.[^.]+$/, ""),
    }));
  };

  const resetForm = () => {
    setForm({ titulo: "", descripcion: "", categoriaId: "", moduloId: "", etiquetaId: "", tipo: 'documento' });
    setFile(null);
    setArchivoSensible(false);
    setCreando(null);
    setNuevoNombre("");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast({ variant: "destructive", title: "Falta el archivo", description: "Selecciona un documento para subir." }); return; }
    if (!form.titulo.trim()) { toast({ variant: "destructive", title: "Falta el título" }); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const path = await subirArchivoBiblioteca(file);
      await crearBibliotecaDoc({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        path,
        nombre_archivo: file.name,
        mime_type: file.type || null,
        tamano_bytes: file.size,
        tipo: form.tipo,
        modulo_id: form.moduloId ? parseInt(form.moduloId) : null,
        etiqueta_id: form.etiquetaId ? parseInt(form.etiquetaId) : null,
        creado_por: user.id,
      });

      toast({ title: "Documento subido", description: `"${form.titulo.trim()}" se agregó a la biblioteca.` });
      setShowUpload(false);
      resetForm();
      cargarDocs();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleEliminar = async () => {
    if (!docAEliminar) return;
    try {
      await eliminarBibliotecaDoc(docAEliminar.id, docAEliminar.path);
      setDocs(prev => prev.filter(d => d.id !== docAEliminar.id));
      toast({ title: "Documento eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDocAEliminar(null);
    }
  };

  const abrirPreview = async (doc: BibliotecaDoc) => {
    setPreviewDoc(doc);
    setPreviewUrl("");
    setPreviewLoading(true);
    try {
      setPreviewUrl(await getBibliotecaSignedUrl(doc.path));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la vista previa." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const descargar = async (doc: BibliotecaDoc) => {
    try {
      window.open(await getBibliotecaSignedUrl(doc.path, true), '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo descargar el documento." });
    }
  };

  const iniciarCreacion = (campo: CampoTaxonomia) => {
    setNuevoNombre("");
    setCreando(campo);
  };

  const confirmarCreacion = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre || !creando) return;
    setCreandoLoading(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      if (creando === 'categoria') {
        const { data, error } = await supabasePROD
          .from('categorias_tutoriales')
          .insert([{ nombre, descripcion: "", orden: 0, creado_por: user.id }])
          .select('id, nombre')
          .single();
        if (error) throw error;
        setCategorias(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setForm(p => ({ ...p, categoriaId: data.id.toString(), moduloId: "", etiquetaId: "" }));
      } else if (creando === 'modulo') {
        if (!form.categoriaId) throw new Error("Primero elige una categoría.");
        const { data, error } = await supabasePROD
          .from('modulos_tutoriales')
          .insert([{ categoria_id: parseInt(form.categoriaId), nombre, descripcion: "", orden: 0, creado_por: user.id }])
          .select('id, nombre')
          .single();
        if (error) throw error;
        setModulos(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setForm(p => ({ ...p, moduloId: data.id.toString(), etiquetaId: "" }));
      } else if (creando === 'etiqueta') {
        if (!form.moduloId) throw new Error("Primero elige un módulo.");
        const et = await vincularEtiquetaAModulo(nombre, parseInt(form.moduloId), user.id);
        setEtiquetasForm(prev =>
          prev.some(e => e.id === et.id) ? prev : [...prev, et].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        setForm(p => ({ ...p, etiquetaId: et.id.toString() }));
      }

      setCreando(null);
      setNuevoNombre("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setCreandoLoading(false);
    }
  };

  // Fila reutilizable: input + botones para crear una categoría/módulo/etiqueta
  // sin salir del modal. Se muestra cuando el usuario elige "Crear nueva…".
  const filaCrear = (placeholder: string) => (
    <div className="flex gap-1.5">
      <Input
        autoFocus
        value={nuevoNombre}
        onChange={e => setNuevoNombre(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); confirmarCreacion(); }
          if (e.key === 'Escape') { e.preventDefault(); setCreando(null); }
        }}
        placeholder={placeholder}
        className="rounded-xl h-9"
      />
      <Button type="button" size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={confirmarCreacion} disabled={creandoLoading || !nuevoNombre.trim()}>
        {creandoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-xl" onClick={() => setCreando(null)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-28 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Library className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">Biblioteca</h1>
                <p className="text-sm text-muted-foreground">Documentos, PDFs y archivos (que no son video).</p>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowUpload(true)} className="rounded-full shadow-sm gap-1.5 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Subir archivo
          </Button>
        </div>

        {/* Segmentado por tipo */}
        <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-full sm:w-auto">
          {([
            { v: 'todos', label: 'Todos', Icon: Library },
            { v: 'documento', label: 'Documentos', Icon: FileText },
            { v: 'codigo', label: 'Código', Icon: FileCode2 },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setFiltroTipo(v)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1 sm:flex-none",
                filtroTipo === v ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, descripción o nombre de archivo"
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={filtroModulo} onValueChange={setFiltroModulo}>
            <SelectTrigger className="rounded-xl md:w-52">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Módulo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los módulos</SelectItem>
              {modulosDisponibles.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}
              <SelectItem value={SIN_MODULO}>Sin módulo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroEtiqueta} onValueChange={setFiltroEtiqueta}>
            <SelectTrigger className="rounded-xl md:w-52">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Etiqueta" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etiquetas</SelectItem>
              {etiquetasDisponibles.map(et => <SelectItem key={et.id} value={et.id.toString()}>{et.nombre}</SelectItem>)}
              <SelectItem value={SIN_ETIQUETA}>Sin etiqueta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listado */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-primary" />
          </div>
        ) : docsFiltrados.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Library className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-medium">{docs.length === 0 ? "La biblioteca está vacía." : "Ningún documento coincide con los filtros."}</p>
            {docs.length === 0 && <p className="text-sm mt-1">Sube tu primer documento con el botón de arriba.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docsFiltrados.map(doc => {
              const Icono = iconoPorArchivo(doc.nombre_archivo, doc.tipo);
              return (
                <Card key={doc.id} className="border-none shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow group">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => abrirPreview(doc)}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left group/title"
                      >
                        <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                          <Icono className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover/title:text-primary transition-colors">{doc.titulo}</h3>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{doc.nombre_archivo}</p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDocAEliminar(doc)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {doc.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.descripcion}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-1 mb-3 mt-auto">
                      {doc.tipo === 'codigo' && (
                        <Badge className="text-[9px] uppercase font-bold bg-primary text-primary-foreground border-none">
                          <FileCode2 className="w-2.5 h-2.5 mr-1" />Código
                        </Badge>
                      )}
                      {doc.modulo?.categoria?.nombre && (
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold bg-primary/10 text-primary border-none">
                          {doc.modulo.categoria.nombre}
                        </Badge>
                      )}
                      {doc.modulo?.nombre && (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/20 text-primary">
                          {doc.modulo.nombre}
                        </Badge>
                      )}
                      {doc.etiqueta?.nombre && (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold border-muted-foreground/20">
                          <Tag className="w-2.5 h-2.5 mr-1" />{doc.etiqueta.nombre}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <span className="text-[10px] text-muted-foreground">
                        {doc.tamano_bytes ? formatFileSize(doc.tamano_bytes) : ""}
                      </span>
                      <Button variant="outline" size="sm" className="rounded-lg h-8 gap-1.5" onClick={() => abrirPreview(doc)}>
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Diálogo de carga */}
      <Dialog open={showUpload} onOpenChange={(o) => { setShowUpload(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-primary" /> Subir archivo
            </DialogTitle>
            <DialogDescription>
              Agrega un archivo a la biblioteca. La categoría, módulo y etiqueta son opcionales (úsalas para organizarlo).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Archivo</Label>
              <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative overflow-hidden">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="text-center px-2 z-10 pointer-events-none">
                  <Paperclip className="mx-auto mb-1.5 text-muted-foreground" />
                  <p className="text-xs font-medium truncate max-w-[300px]">{file ? file.name : `Selecciona un archivo (máx. ${MAX_DOCUMENT_SIZE_MB}MB)`}</p>
                  {file && <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>}
                </div>
              </div>
            </div>

            {archivoSensible && (
              <div className="flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
                  <p className="font-bold">Este archivo parece contener secretos.</p>
                  <p>
                    Cualquier persona que inicie sesión podrá descargarlo. No subas llaves ni contraseñas
                    reales aquí; usa un gestor de secretos y comparte solo una plantilla de ejemplo.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-full">
                {([
                  { v: 'documento' as TipoBiblioteca, label: 'Documento', Icon: FileText },
                  { v: 'codigo' as TipoBiblioteca, label: 'Código', Icon: FileCode2 },
                ]).map(({ v, label, Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, tipo: v }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1",
                      form.tipo === v ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bib-titulo">Título</Label>
              <Input
                id="bib-titulo"
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Nombre con el que se mostrará"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bib-desc">Descripción (Opcional)</Label>
              <Textarea
                id="bib-desc"
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="¿Qué contiene este documento?"
                className="rounded-xl min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Categoría</Label>
                <Select value={form.categoriaId} onValueChange={v => v === CREAR_NUEVO ? iniciarCreacion('categoria') : setForm(p => ({ ...p, categoriaId: v, moduloId: "", etiquetaId: "" }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={CREAR_NUEVO} className="text-primary font-medium focus:bg-primary/10">
                      <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear nueva...</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Módulo</Label>
                <Select value={form.moduloId} onValueChange={v => v === CREAR_NUEVO ? iniciarCreacion('modulo') : setForm(p => ({ ...p, moduloId: v, etiquetaId: "" }))} disabled={!form.categoriaId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {modulos.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={CREAR_NUEVO} className="text-primary font-medium focus:bg-primary/10">
                      <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear nuevo...</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Etiqueta</Label>
                <Select value={form.etiquetaId} onValueChange={v => v === CREAR_NUEVO ? iniciarCreacion('etiqueta') : setForm(p => ({ ...p, etiquetaId: v === "NONE" ? "" : v }))} disabled={!form.moduloId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={etiquetasForm.length === 0 ? "—" : "Etiqueta"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin etiqueta</SelectItem>
                    {etiquetasForm.map(et => <SelectItem key={et.id} value={et.id.toString()}>{et.nombre}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={CREAR_NUEVO} className="text-primary font-medium focus:bg-primary/10">
                      <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear nueva...</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {creando && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <Label className="text-xs font-semibold text-primary">
                  {creando === 'categoria' && "Nueva categoría"}
                  {creando === 'modulo' && "Nuevo módulo"}
                  {creando === 'etiqueta' && "Nueva etiqueta"}
                </Label>
                {creando === 'modulo' && !form.categoriaId ? (
                  <p className="text-xs text-muted-foreground">Primero elige una categoría.</p>
                ) : creando === 'etiqueta' && !form.moduloId ? (
                  <p className="text-xs text-muted-foreground">Primero elige un módulo.</p>
                ) : filaCrear(
                  creando === 'categoria' ? "Ej: Logística" :
                  creando === 'modulo' ? "Ej: Devoluciones" :
                  "Ej: Mercado Libre"
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setShowUpload(false); resetForm(); }} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading} className="rounded-xl px-6">
                {uploading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Subiendo...</> : <><Save className="mr-2 h-4 w-4" /> Guardar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <AlertDialog open={!!docAEliminar} onOpenChange={(o) => !o && setDocAEliminar(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará "{docAEliminar?.titulo}" de la biblioteca y se borrará el archivo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="rounded-xl bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vista previa del documento */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) { setPreviewDoc(null); setPreviewUrl(""); } }}>
        <DialogContent className="max-w-4xl rounded-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 pr-8 text-base">
              {previewDoc && React.createElement(iconoPorArchivo(previewDoc.nombre_archivo, previewDoc.tipo), { className: "w-4 h-4 text-primary shrink-0" })}
              <span className="truncate">{previewDoc?.titulo}</span>
            </DialogTitle>
            <DialogDescription className="truncate">{previewDoc?.nombre_archivo}</DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 min-h-[50vh] max-h-[70vh] overflow-auto flex items-center justify-center">
            {previewLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : !previewUrl || !previewDoc ? (
              <p className="text-sm text-muted-foreground p-8">No se pudo cargar la vista previa.</p>
            ) : getDocumentPreviewKind(previewDoc.nombre_archivo) === 'image' ? (
              <img src={previewUrl} alt={previewDoc.titulo} className="max-w-full max-h-[70vh] object-contain" />
            ) : getDocumentPreviewKind(previewDoc.nombre_archivo) === 'pdf' ? (
              <iframe src={previewUrl} title={previewDoc.titulo} className="w-full h-[70vh] bg-white" />
            ) : (
              <div className="text-center p-10 text-muted-foreground">
                {React.createElement(iconoPorArchivo(previewDoc.nombre_archivo, previewDoc.tipo), { className: "w-14 h-14 mx-auto mb-3 opacity-30" })}
                <p className="font-medium">
                  {previewDoc.tipo === 'codigo' ? "Archivo de código." : "Este tipo de archivo no se puede previsualizar aquí."}
                </p>
                <p className="text-sm mt-1">Descárgalo para usarlo.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 p-3 border-t">
            {previewDoc && (
              <>
                <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => previewUrl && window.open(previewUrl, '_blank', 'noopener,noreferrer')} disabled={!previewUrl}>
                  <ExternalLink className="h-4 w-4" /> Abrir en pestaña
                </Button>
                <Button className="rounded-xl gap-1.5" onClick={() => descargar(previewDoc)}>
                  <Download className="h-4 w-4" /> Descargar
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
