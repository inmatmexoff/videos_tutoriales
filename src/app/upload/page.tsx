"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Video, 
  Layout, 
  FileText, 
  Clock,
  Loader2,
  FileVideo,
  AlertTriangle,
  ImageIcon,
  ClipboardCheck,
  PlusCircle,
  FolderOpen,
  Trash2,
  Calendar,
  Clock9,
  Info,
  Monitor,
  Settings,
  Paperclip,
  X,
  ListChecks,
  Plus,
  Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { Etiqueta, fetchEtiquetasDeModulo } from "@/lib/etiquetas";
import { DocumentoRef, MAX_DOCUMENT_SIZE_MB, formatFileSize } from "@/lib/documentos";
import { EnlaceSistema, ensureUrlProtocol } from "@/lib/enlaces";
import { compressImage } from "@/lib/image";
import { sanitizeKeySegment, sanitizeFileName } from "@/lib/storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminGuard } from "@/components/admin-guard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Categoria {
  id: number;
  nombre: string;
}

interface Modulo {
  id: number;
  nombre: string;
}

interface Borrador {
  id: string;
  titulo: string;
  descripcion: string;
  categoriaId: string;
  moduloId: string;
  etiquetaId: string;
  tipoContenido: string;
  fecha: string;
}

const MAX_FILE_SIZE_MB = 50;
const DRAFTS_KEY = "tutorial_upload_drafts_v3";

export default function UploadTutorialPage() {
  return (
    <AdminGuard>
      <UploadContent />
    </AdminGuard>
  );
}

function UploadContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [modules, setModules] = useState<Modulo[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [drafts, setDrafts] = useState<Borrador[]>([]);
  const [showDraftsDialog, setShowDraftsDialog] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingEtiquetas, setLoadingEtiquetas] = useState(false);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadLater, setUploadLater] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [checklistInput, setChecklistInput] = useState("");
  const [enlaces, setEnlaces] = useState<EnlaceSistema[]>([]);
  const [enlaceNombreInput, setEnlaceNombreInput] = useState("");
  const [enlaceUrlInput, setEnlaceUrlInput] = useState("");

  const [fileError, setFileError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoriaId: "",
    moduloId: "",
    etiquetaId: "",
    titulo: "",
    descripcion: "",
    duracion: "0",
    tipoContenido: "operacion"
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabasePROD
          .from('categorias_tutoriales')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las categorías." });
      }
    }

    const savedDrafts = localStorage.getItem(DRAFTS_KEY);
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts));
      } catch (e) {
        setDrafts([]);
      }
    }

    fetchCategories();
  }, [toast]);

  useEffect(() => {
    async function fetchModules() {
      if (!formData.categoriaId) {
        setModules([]);
        return;
      }

      try {
        setLoadingModules(true);
        const { data, error } = await supabasePROD
          .from('modulos_tutoriales')
          .select('id, nombre')
          .eq('categoria_id', formData.categoriaId)
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        setModules(data || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los módulos." });
      } finally {
        setLoadingModules(false);
      }
    }
    fetchModules();
  }, [formData.categoriaId, toast]);

  useEffect(() => {
    async function cargarEtiquetas() {
      if (!formData.moduloId) {
        setEtiquetas([]);
        return;
      }

      try {
        setLoadingEtiquetas(true);
        setEtiquetas(await fetchEtiquetasDeModulo(formData.moduloId));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las etiquetas." });
      } finally {
        setLoadingEtiquetas(false);
      }
    }
    cargarEtiquetas();
  }, [formData.moduloId, toast]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setFileError(`El video es demasiado grande (${fileSizeMB.toFixed(1)}MB). El límite permitido es de ${MAX_FILE_SIZE_MB}MB.`);
        setVideoFile(null);
        setVideoPreview(null);
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));

      // URL aparte solo para leer la duración: revocarla no debe afectar
      // la del preview visible (antes reusaban la misma y el preview
      // quedaba en blanco en cuanto esta se revocaba).
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setFormData(prev => ({ ...prev, duracion: Math.floor(video.duration).toString() }));
      };
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
    }
  };

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const tooLarge = files.filter(f => f.size / (1024 * 1024) > MAX_DOCUMENT_SIZE_MB);
    if (tooLarge.length > 0) {
      setFileError(`"${tooLarge[0].name}" supera el límite de ${MAX_DOCUMENT_SIZE_MB}MB por documento.`);
      e.target.value = "";
      return;
    }

    setFileError(null);
    setDocumentFiles(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddChecklistItem = () => {
    const text = checklistInput.trim();
    if (!text) return;
    setChecklistItems(prev => [...prev, text]);
    setChecklistInput("");
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddEnlace = () => {
    const nombre = enlaceNombreInput.trim();
    const url = enlaceUrlInput.trim();
    if (!nombre || !url) return;
    setEnlaces(prev => [...prev, { nombre, url: ensureUrlProtocol(url) }]);
    setEnlaceNombreInput("");
    setEnlaceUrlInput("");
  };

  const handleRemoveEnlace = (index: number) => {
    setEnlaces(prev => prev.filter((_, i) => i !== index));
  };

  // Evita que se guarde sin agregar el link: si hay texto en los inputs y no
  // se dio click en "+", el link no queda en `enlaces` y se pierde.
  const hasPendingEnlace = enlaceNombreInput.trim().length > 0 || enlaceUrlInput.trim().length > 0;

  const handleSaveDraft = () => {
    if (!formData.titulo && !formData.descripcion) {
      toast({ variant: "destructive", title: "Borrador vacío", description: "Escribe al menos un título para guardar el borrador." });
      return;
    }

    const newDraft: Borrador = {
      id: Date.now().toString(),
      titulo: formData.titulo || "Sin título",
      descripcion: formData.descripcion,
      categoriaId: formData.categoriaId,
      moduloId: formData.moduloId,
      etiquetaId: formData.etiquetaId,
      tipoContenido: formData.tipoContenido,
      fecha: new Date().toLocaleString()
    };

    const updatedDrafts = [newDraft, ...drafts].slice(0, 10);
    setDrafts(updatedDrafts);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));
    toast({ title: "Borrador guardado" });
  };

  const handleLoadDraft = (draft: Borrador) => {
    setFormData({
      titulo: draft.titulo === "Sin título" ? "" : draft.titulo,
      descripcion: draft.descripcion,
      categoriaId: draft.categoriaId,
      moduloId: draft.moduloId,
      // Borradores viejos guardaban un subcategoriaId (otra tabla, otros ids):
      // se ignora a propósito para no arrastrar un id que ya no corresponde.
      etiquetaId: draft.etiquetaId || "",
      tipoContenido: draft.tipoContenido || "operacion",
      duracion: formData.duracion
    });
    setShowDraftsDialog(false);
    toast({ title: "Borrador cargado" });
  };

  const handleDeleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.moduloId || !formData.titulo) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Por favor selecciona categoría, módulo y un título." });
      return;
    }

    if (!uploadLater && !videoFile) {
      toast({ variant: "destructive", title: "Video requerido", description: "Selecciona un video o activa 'Cargar más tarde'." });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const cat = categories.find(c => c.id.toString() === formData.categoriaId);
      const mod = modules.find(m => m.id.toString() === formData.moduloId);
      
      const cleanCat = sanitizeKeySegment(cat?.nombre || 'General', 'General');
      const cleanMod = sanitizeKeySegment(mod?.nombre || 'Sin_Modulo', 'Sin_Modulo');
      const timestamp = Date.now();

      let videoUrl = "";
      if (videoFile && !uploadLater) {
        const videoFileName = `${timestamp}_${sanitizeFileName(videoFile.name)}`;
        const videoPath = `${cleanCat}/${cleanMod}/videos/${videoFileName}`;
        const { error: videoError } = await supabasePROD.storage.from('videos-tutoriales').upload(videoPath, videoFile);
        if (videoError) throw videoError;
        const { data: { publicUrl } } = supabasePROD.storage.from('videos-tutoriales').getPublicUrl(videoPath);
        videoUrl = publicUrl;
      }

      let miniaturaUrl = `https://picsum.photos/seed/${Math.random()}/600/400`;
      if (imageFile) {
        const imgFileName = `${timestamp}_${sanitizeFileName(imageFile.name)}`;
        const imgPath = `${cleanCat}/${cleanMod}/thumbnails/${imgFileName}`;
        const { error: imgError } = await supabasePROD.storage.from('videos-tutoriales').upload(imgPath, imageFile);
        if (imgError) throw imgError;
        const { data: { publicUrl: imgUrl } } = supabasePROD.storage.from('videos-tutoriales').getPublicUrl(imgPath);
        miniaturaUrl = imgUrl;
      }

      const documentos: DocumentoRef[] = [];
      for (const doc of documentFiles) {
        const docFileName = `${timestamp}_${sanitizeFileName(doc.name)}`;
        const docPath = `${cleanCat}/${cleanMod}/documentos/${docFileName}`;
        const { error: docError } = await supabasePROD.storage.from('documentos-tutoriales').upload(docPath, doc);
        if (docError) throw docError;
        documentos.push({ nombre: doc.name, path: docPath });
      }

      // El nuevo video se agrega al final del orden dentro de su mismo módulo/etiqueta
      let ordenQuery = supabasePROD
        .from('tutoriales')
        .select('orden')
        .eq('modulo_id', parseInt(formData.moduloId))
        .order('orden', { ascending: false })
        .limit(1);
      ordenQuery = formData.etiquetaId
        ? ordenQuery.eq('etiqueta_id', parseInt(formData.etiquetaId))
        : ordenQuery.is('etiqueta_id', null);
      const { data: maxOrdenRows } = await ordenQuery;
      const nextOrden = maxOrdenRows && maxOrdenRows.length > 0 ? maxOrdenRows[0].orden + 1 : 0;

      const { data: newTutorial, error: dbError } = await supabasePROD.from('tutoriales').insert([{
        modulo_id: parseInt(formData.moduloId),
        etiqueta_id: formData.etiquetaId ? parseInt(formData.etiquetaId) : null,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        url_video: videoUrl,
        miniatura_url: miniaturaUrl,
        documentos: documentos.length > 0 ? documentos : null,
        checklist: checklistItems.length > 0 ? checklistItems : null,
        enlaces_sistemas: enlaces.length > 0 ? enlaces : null,
        duracion_segundos: parseInt(formData.duracion) || 0,
        orden: nextOrden,
        es_espacio: uploadLater,
        tipo_contenido: formData.tipoContenido,
        creado_por: user.id
      }]).select().single();

      if (dbError) throw dbError;

      // Log Auditoría
      if (newTutorial) {
        await supabasePROD.from('auditoria_tutoriales').insert([{
          tutorial_id: newTutorial.id,
          usuario_id: user.id,
          accion: 'CREACION',
          detalles: `El usuario creó el proceso: ${formData.titulo} (${uploadLater ? 'Espacio' : 'Video Completo'})`
        }]);
      }
      
      toast({ title: "¡Éxito!", description: uploadLater ? "Espacio de proceso creado correctamente." : "El video ha sido registrado correctamente." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>

          <Dialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
                <FolderOpen className="mr-2 h-4 w-4 text-primary" />
                Mis Borradores
                {drafts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary border-none">{drafts.length}</Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Borradores Guardados</DialogTitle>
                <DialogDescription>Selecciona un borrador para recuperar la información.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                <div className="space-y-3">
                  {drafts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>No hay borradores.</p>
                    </div>
                  ) : (
                    drafts.map((draft) => (
                      <div 
                        key={draft.id} 
                        onClick={() => handleLoadDraft(draft)}
                        className="group p-4 border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-sm line-clamp-1 pr-8">{draft.titulo}</h4>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteDraft(e, draft.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{draft.descripcion || "Sin descripción"}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="secondary" className="bg-primary/5 text-primary scale-75 origin-left">{draft.tipoContenido === 'operacion' ? 'Operación' : 'Software'}</Badge>
                          <Calendar className="w-3 h-3" /> {draft.fecha}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Nuevo Proceso</CardTitle>
            </div>
            <CardDescription>Crea un espacio de trabajo o sube un video completo.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {fileError && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error de archivo</AlertTitle>
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-primary font-bold">
                    <Clock9 className="w-4 h-4" /> Cargar video más tarde
                  </Label>
                  <p className="text-xs text-muted-foreground">Crea un "espacio" con título y descripción para subir el video después.</p>
                </div>
                <Switch checked={uploadLater} onCheckedChange={setUploadLater} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={formData.categoriaId} onValueChange={(v) => v === "ADD_NEW_CATEGORY" ? router.push('/admin') : setFormData(p => ({ ...p, categoriaId: v, moduloId: "" }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                      <SelectSeparator />
                      <SelectItem value="ADD_NEW_CATEGORY" className="text-primary font-medium focus:bg-primary/10">
                        <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear nueva...</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={formData.moduloId} onValueChange={(v) => v === "ADD_NEW_MODULE" ? router.push('/admin') : setFormData(p => ({ ...p, moduloId: v, etiquetaId: "" }))} disabled={!formData.categoriaId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingModules ? "Cargando..." : "Selecciona módulo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}
                      <SelectSeparator />
                      <SelectItem value="ADD_NEW_MODULE" className="text-primary font-medium focus:bg-primary/10">
                        <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear nuevo...</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Contenido</Label>
                  <Select value={formData.tipoContenido} onValueChange={(v) => setFormData(p => ({ ...p, tipoContenido: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operacion">
                        <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Operación</div>
                      </SelectItem>
                      <SelectItem value="software">
                        <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Software</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etiqueta (Opcional)</Label>
                  <Select value={formData.etiquetaId} onValueChange={(v) => v === "ADD_NEW_SUBCATEGORY" ? router.push('/admin') : setFormData(p => ({ ...p, etiquetaId: v === "NONE" ? "" : v }))} disabled={!formData.moduloId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingEtiquetas ? "Cargando..." : etiquetas.length === 0 ? "Sin etiquetas en este módulo" : "Selecciona etiqueta"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin etiqueta</SelectItem>
                      {etiquetas.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>)}
                      <SelectSeparator />
                      <SelectItem value="ADD_NEW_SUBCATEGORY" className="text-primary font-medium focus:bg-primary/10">
                        <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear nueva...</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Proceso</Label>
                <div className="relative">
                  <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="titulo"
                    className="pl-10 rounded-xl"
                    placeholder="Nombre del proceso"
                    value={formData.titulo}
                    onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-300 ${uploadLater ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="flex items-center gap-2">
                        Archivo de Video
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </Label>
                      <Badge variant="outline" className="text-[9px] h-4 bg-orange-500/5 text-orange-600 border-orange-200 uppercase font-bold tracking-wider">
                        Máx. {MAX_FILE_SIZE_MB}MB
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative overflow-hidden">
                      {videoPreview && <video src={videoPreview} className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                      <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVideoChange} disabled={uploadLater} />
                      <div className="text-center px-2 z-10 pointer-events-none">
                        <FileVideo className={`mx-auto mb-2 ${videoFile ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs truncate max-w-[200px] font-medium">{videoFile ? videoFile.name : "Seleccionar Video"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Miniatura (Imagen)</Label>
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative overflow-hidden">
                      {imagePreview && <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                      <div className="text-center px-2 z-10 pointer-events-none">
                        <ImageIcon className={`mx-auto mb-2 ${imageFile ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs truncate max-w-[200px] font-medium">{imageFile ? imageFile.name : "Seleccionar Imagen"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-2">
                    <Label>Vista Previa</Label>
                    <div className="aspect-video bg-muted rounded-xl flex items-center justify-center border-2 border-dashed overflow-hidden">
                      {videoPreview ? (
                        <video src={videoPreview} controls className="w-full h-full object-contain" />
                      ) : imagePreview ? (
                        <img src={imagePreview} className="w-full h-full object-cover" alt="Thumb" />
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          <Video className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">Previa de archivos</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Label className="flex items-center gap-2">
                    Documentos (Opcional)
                  </Label>
                  <Badge variant="outline" className="text-[9px] h-4 bg-orange-500/5 text-orange-600 border-orange-200 uppercase font-bold tracking-wider">
                    Máx. {MAX_DOCUMENT_SIZE_MB}MB c/u
                  </Badge>
                </div>
                <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative overflow-hidden">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleDocumentsChange}
                  />
                  <div className="text-center px-2 z-10 pointer-events-none">
                    <Paperclip className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs font-medium">Adjuntar documentos (PDF, Word, Excel, etc.)</p>
                  </div>
                </div>

                {documentFiles.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {documentFiles.map((doc, index) => (
                      <div key={`${doc.name}-${index}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs font-medium truncate">{doc.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">({formatFileSize(doc.size)})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveDocument(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Checklist (Opcional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={checklistInput}
                    onChange={e => setChecklistInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); } }}
                    placeholder="Escribe un punto del checklist y presiona Enter"
                    className="rounded-xl"
                  />
                  <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={handleAddChecklistItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {checklistItems.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {checklistItems.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground shrink-0">{index + 1}.</span>
                          <span className="text-xs font-medium truncate">{item}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveChecklistItem(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Links a sistemas (Opcional)
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={enlaceNombreInput}
                    onChange={e => setEnlaceNombreInput(e.target.value)}
                    placeholder="Nombre (ej. Plataforma ML)"
                    className="rounded-xl"
                  />
                  <Input
                    value={enlaceUrlInput}
                    onChange={e => setEnlaceUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEnlace(); } }}
                    placeholder="URL (ej. https://...)"
                    className="rounded-xl"
                  />
                  <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={handleAddEnlace}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {hasPendingEnlace && (
                  <p className="text-xs text-orange-600 font-medium">
                    Presiona "+" para agregar este link antes de guardar, o se perderá.
                  </p>
                )}

                {enlaces.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {enlaces.map((enlace, index) => (
                      <div key={`${enlace.url}-${index}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs font-bold truncate">{enlace.nombre}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{enlace.url}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveEnlace(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="descripcion"
                    className="pl-10 rounded-xl min-h-[100px]"
                    placeholder="¿De qué trata este proceso?"
                    value={formData.descripcion}
                    onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracion">Duración (segundos)</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="duracion"
                    readOnly
                    className="pl-10 rounded-xl bg-muted/50 cursor-not-allowed"
                    value={formData.duracion}
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleSaveDraft} className="rounded-xl w-full sm:w-auto">
                <ClipboardCheck className="mr-2 h-4 w-4" /> Guardar Borrador
              </Button>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl flex-1 sm:flex-none">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || hasPendingEnlace} className="rounded-xl px-8 shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                  {loading ? (
                    <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Guardando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> {uploadLater ? 'Crear Espacio' : 'Guardar Proceso'}</>
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
