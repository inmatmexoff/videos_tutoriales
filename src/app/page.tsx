"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Play, 
  Trash2, 
  Video, 
  Clock, 
  MoreVertical,
  ArrowLeft,
  Loader2,
  Info,
  Edit2,
  Layers,
  LogOut,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  FolderOpen,
  Clock9,
  AlertCircle,
  UploadCloud,
  FileVideo,
  Monitor,
  Settings,
  Filter,
  Tag,
  MessageCircle,
  SendHorizontal,
  Lock,
  FileText,
  Download,
  ListChecks,
  Circle,
  GraduationCap,
  X,
  Link2,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";
import { DocumentoRef, getDocumentPreviewKind, DOCUMENTOS_BUCKET, DOCUMENT_SIGNED_URL_TTL_SECONDS } from "@/lib/documentos";
import { downloadChecklistPdf, normalizeChecklist } from "@/lib/checklist-pdf";
import { EnlaceSistema, normalizeEnlaces } from "@/lib/enlaces";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Tutorial {
  id: number;
  titulo: string;
  descripcion: string;
  url_video: string;
  miniatura_url: string;
  documentos: DocumentoRef[] | null;
  checklist: string[] | null;
  enlaces_sistemas: EnlaceSistema[] | null;
  duracion_segundos: number;
  es_espacio: boolean;
  tipo_contenido: 'operacion' | 'software';
  orden: number;
  subcategoria: {
    nombre: string;
  } | null;
  modulo: {
    id: number;
    nombre: string;
    categoria: {
      nombre: string;
    }
  }
}

type TipoComentario = 'comentario' | 'duda' | 'mejora';

interface Comentario {
  id: number;
  tutorial_id: number;
  usuario_id: string;
  autor_nombre: string;
  contenido: string;
  fecha_creacion: string;
  tipo: TipoComentario;
  resuelto: boolean;
}

export default function TutorialsPage() {
  return (
    <AdminGuard>
      <TutorialsContent />
    </AdminGuard>
  );
}

function TutorialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showMobileSearch = searchParams.get('buscar') === '1';
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewingTutorial, setViewingTutorial] = useState<Tutorial | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentoRef | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [comments, setComments] = useState<Comentario[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newCommentType, setNewCommentType] = useState<TipoComentario>("comentario");
  const [activeCommentTab, setActiveCommentTab] = useState<TipoComentario>("comentario");
  const [postingComment, setPostingComment] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");

  // Candado temporal mientras se define el sistema de roles: hoy cualquier
  // usuario logueado puede borrar videos, así que se pide esta contraseña
  // compartida como freno adicional.
  const DELETE_PASSWORD = "InmatmexGo26";

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };
  const { toast } = useToast();

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkCategoryScroll();
    const el = categoryScrollRef.current;
    if (!el) return;
    const handleResize = () => checkCategoryScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categories, loadingCategories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    categoryScrollRef.current?.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabasePROD
        .from('tutoriales')
        .select(`
          id, titulo, descripcion, url_video, miniatura_url, documentos, checklist, enlaces_sistemas, duracion_segundos, es_espacio, tipo_contenido, orden,
          subcategoria:subcategorias_tutoriales (nombre),
          modulo:modulos_tutoriales (
            id,
            nombre,
            categoria:categorias_tutoriales (nombre)
          )
        `)
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('fecha_creacion', { ascending: true });

      if (error) throw error;
      setTutorials(data as any || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabasePROD.auth.getUser();
      setUserEmail(user?.email || null);
      setUserId(user?.id || null);
      setUserName(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null);

      const helpShown = sessionStorage.getItem('welcome_modal_shown');
      if (!helpShown) {
        setShowHelp(true);
        sessionStorage.setItem('welcome_modal_shown', 'true');
      }
    }

    async function fetchCategories() {
      try {
        setLoadingCategories(true);
        const { data } = await supabasePROD
          .from('categorias_tutoriales')
          .select('nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true });
        if (data) setCategories(data.map(cat => cat.nombre));
      } finally {
        setLoadingCategories(false);
      }
    }
    
    fetchUserData();
    fetchCategories();
    fetchTutorials();
  }, [toast]);

  const filteredTutorials = useMemo(() => {
    return tutorials.filter(t => {
      const matchesSearch = t.titulo.toLowerCase().includes(search.toLowerCase()) || 
                           t.descripcion.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || t.modulo.categoria.nombre === selectedCategory;
      const matchesType = selectedType === "all" || t.tipo_contenido === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [tutorials, search, selectedCategory, selectedType]);

  const NO_SUBCATEGORY = "__sin_subcategoria__";

  const groupedTutorials = useMemo(() => {
    const groups: Record<string, Record<string, Tutorial[]>> = {};
    filteredTutorials.forEach(t => {
      // Si estamos viendo "Todos", agrupamos por categoría.
      // Si estamos en una categoría específica, agrupamos por módulo.
      const groupName = selectedCategory === "all"
        ? (t.modulo?.categoria?.nombre || "General")
        : (t.modulo?.nombre || "General");
      // Dentro de cada grupo, seccionamos por subcategoría (ej: Mercado Libre, Walmart, Amazon).
      const subgroupName = t.subcategoria?.nombre || NO_SUBCATEGORY;

      if (!groups[groupName]) groups[groupName] = {};
      if (!groups[groupName][subgroupName]) groups[groupName][subgroupName] = [];
      groups[groupName][subgroupName].push(t);
    });
    Object.values(groups).forEach(subgroups => {
      Object.values(subgroups).forEach(list => list.sort((a, b) => a.orden - b.orden));
    });
    return groups;
  }, [filteredTutorials, selectedCategory]);

  const handleDelete = async (id: number) => {
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabasePROD.from('tutoriales').update({ activo: false }).eq('id', id);
      if (error) throw error;

      await supabasePROD.from('auditoria_tutoriales').insert([{
        tutorial_id: id,
        usuario_id: user.id,
        accion: 'ELIMINACION',
        detalles: `El usuario eliminó el tutorial con ID ${id}`
      }]);

      setTutorials(prev => prev.filter(t => t.id !== id));
      toast({ title: "Tutorial eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const requestDelete = (id: number) => {
    setDeleteTargetId(id);
    setDeletePassword("");
    setDeletePasswordError("");
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    if (deletePassword !== DELETE_PASSWORD) {
      setDeletePasswordError("Contraseña incorrecta.");
      return;
    }
    await handleDelete(deleteTargetId);
    setDeleteTargetId(null);
    setDeletePassword("");
    setDeletePasswordError("");
  };

  const handleLogout = async () => {
    await supabasePROD.auth.signOut();
    router.push('/login');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchComments = async (tutorialId: number) => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabasePROD
        .from('comentarios_tutoriales')
        .select('id, tutorial_id, usuario_id, autor_nombre, contenido, fecha_creacion, tipo, resuelto')
        .eq('tutorial_id', tutorialId)
        .eq('activo', true)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los comentarios." });
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (viewingTutorial) {
      fetchComments(viewingTutorial.id);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      setComments([]);
      setNewComment("");
      setNewCommentType("comentario");
      setActiveCommentTab("comentario");
    }
  }, [viewingTutorial?.id]);

  useEffect(() => {
    async function loadDocumentUrls() {
      const documentos = viewingTutorial?.documentos;
      if (!documentos || documentos.length === 0) {
        setDocumentUrls({});
        return;
      }

      const paths = documentos.map(d => d.path);
      const { data, error } = await supabasePROD.storage
        .from(DOCUMENTOS_BUCKET)
        .createSignedUrls(paths, DOCUMENT_SIGNED_URL_TTL_SECONDS);

      if (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los documentos." });
        return;
      }

      const urlMap: Record<string, string> = {};
      data?.forEach(item => {
        if (item.signedUrl && !item.error) urlMap[item.path ?? ''] = item.signedUrl;
      });
      setDocumentUrls(urlMap);
    }

    loadDocumentUrls();
  }, [viewingTutorial?.id]);

  const handlePostComment = async () => {
    if (!viewingTutorial || !newComment.trim()) return;
    setPostingComment(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabasePROD
        .from('comentarios_tutoriales')
        .insert([{
          tutorial_id: viewingTutorial.id,
          usuario_id: user.id,
          autor_nombre: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          contenido: newComment.trim(),
          tipo: newCommentType,
        }])
        .select()
        .single();

      if (error) throw error;
      setComments(prev => [data, ...prev]);
      setActiveCommentTab(newCommentType);
      setNewComment("");
      setNewCommentType("comentario");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabasePROD
        .from('comentarios_tutoriales')
        .update({ activo: false })
        .eq('id', commentId);

      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleToggleResuelto = async (comment: Comentario) => {
    const nuevoValor = !comment.resuelto;
    try {
      const { error } = await supabasePROD
        .from('comentarios_tutoriales')
        .update({ resuelto: nuevoValor })
        .eq('id', comment.id);

      if (error) throw error;
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, resuelto: nuevoValor } : c));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleVideoEnded = async (tutorialId: number) => {
    if (!userId) return;
    try {
      const { error } = await supabasePROD
        .from('visualizaciones_tutoriales')
        .upsert(
          { tutorial_id: tutorialId, usuario_id: userId, fecha_visualizacion: new Date().toISOString() },
          { onConflict: 'tutorial_id,usuario_id' }
        );
      if (error) throw error;
    } catch (error: any) {
      // No molestamos al usuario con un toast por esto; solo lo dejamos en consola.
      console.error("No se pudo registrar la visualización:", error.message);
    }
  };

  const relatedTutorials = useMemo(() => {
    if (!viewingTutorial) return [];
    return tutorials
      .filter(t => t.id !== viewingTutorial.id && t.modulo?.categoria?.nombre === viewingTutorial.modulo?.categoria?.nombre)
      .slice(0, 12);
  }, [tutorials, viewingTutorial]);

  const renderTutorialCard = (tutorial: Tutorial) => (
    <Card key={tutorial.id} className="group overflow-hidden rounded-2xl border-none ring-1 ring-border bg-card/50 hover:ring-primary/50 transition-all duration-300">
      <div
        className="relative aspect-video overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
        onClick={() => setViewingTutorial(tutorial)}
      >
        {!tutorial.es_espacio && tutorial.url_video ? (
          <Image
            src={tutorial.miniatura_url || "https://picsum.photos/seed/placeholder/600/400"}
            alt=""
            fill
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/40 group-hover:text-primary/40 transition-colors">
            <UploadCloud className="w-12 h-12 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Subir Video</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" className="rounded-full h-12 w-12 p-0 shadow-xl pointer-events-none">
            {!tutorial.es_espacio ? <Play className="fill-current w-5 h-5" /> : <Info className="w-5 h-5" />}
          </Button>
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {tutorial.es_espacio && (
            <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-none rounded-lg flex items-center gap-1 shadow-lg text-[10px] font-black py-1 px-2">
              <AlertCircle className="w-3 h-3" /> ESPACIO
            </Badge>
          )}
          <Badge
            className={cn(
              "border-none rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest py-1 px-2 shadow-lg",
              tutorial.tipo_contenido === 'software' ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
            )}
          >
            {tutorial.tipo_contenido === 'software' ? <Monitor className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            {tutorial.tipo_contenido === 'software' ? 'Software' : 'Operación'}
          </Badge>
        </div>

        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
          <Clock className="w-3 h-3" /> {!tutorial.es_espacio ? formatDuration(tutorial.duracion_segundos) : "Pte. Video"}
        </div>
      </div>
      <CardHeader className="p-5">
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="text-[10px] uppercase font-bold w-fit bg-primary/10 text-primary border-none">
              {selectedCategory === "all" ? (tutorial.modulo?.nombre || "General") : (tutorial.modulo?.categoria?.nombre || "General")}
            </Badge>
            {tutorial.subcategoria && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold w-fit border-primary/20 text-primary">
                {tutorial.subcategoria.nombre}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl">
                <DropdownMenuItem onClick={() => router.push(`/edit/${tutorial.id}`)} className="cursor-pointer rounded-lg">
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive cursor-pointer rounded-lg" onClick={() => requestDelete(tutorial.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle
              onClick={() => setViewingTutorial(tutorial)}
              className="text-lg font-bold mt-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors cursor-pointer"
            >
              {tutorial.titulo}
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tutorial.titulo}</p>
          </TooltipContent>
        </Tooltip>
      </CardHeader>
    </Card>
  );

  if (viewingTutorial) {
    const visibleComments = comments
      .filter(c => c.tipo === activeCommentTab)
      .sort((a, b) => {
        if (activeCommentTab === 'duda' && a.resuelto !== b.resuelto) return a.resuelto ? 1 : -1;
        return 0;
      });

    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <button
          type="button"
          onClick={() => setViewingTutorial(null)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </button>
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna principal: video, descripción y comentarios */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Categoría / módulo: arriba del video para que se vean bien */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs md:text-sm font-extrabold uppercase tracking-wide border-primary/30 text-primary bg-primary/5">
                {viewingTutorial.modulo.categoria.nombre}
              </Badge>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-bold text-sm md:text-base text-foreground/90">{viewingTutorial.modulo.nombre}</span>
              {viewingTutorial.subcategoria && (
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none text-xs">
                  {viewingTutorial.subcategoria.nombre}
                </Badge>
              )}
            </div>

            {!viewingTutorial.es_espacio && viewingTutorial.url_video ? (
              <div className="aspect-video bg-black rounded-3xl overflow-hidden relative shadow-2xl ring-1 ring-border group">
                <video
                  src={viewingTutorial.url_video}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  playsInline
                  onEnded={() => handleVideoEnded(viewingTutorial.id)}
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-primary/20 gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Clock9 className="w-12 h-12 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">Video Pendiente</h2>
                  <p className="text-muted-foreground">Este es un espacio reservado. El video aún no ha sido cargado.</p>
                </div>
                <Button onClick={() => router.push(`/edit/${viewingTutorial.id}`)} className="rounded-xl">
                  <Edit2 className="w-4 h-4 mr-2" /> Cargar video ahora
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug">{viewingTutorial.titulo}</h1>
                <Badge
                  className={cn(
                    "border-none rounded-lg inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase tracking-wider shadow-sm w-fit",
                    viewingTutorial.tipo_contenido === 'software' ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                  )}
                >
                  {viewingTutorial.tipo_contenido === 'software' ? <Monitor className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                  {viewingTutorial.tipo_contenido === 'software' ? 'Software' : 'Operación'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">{viewingTutorial.descripcion}</p>

              {viewingTutorial.documentos && viewingTutorial.documentos.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Documentos</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingTutorial.documentos.map((doc, index) => (
                      <button
                        key={`${doc.path}-${index}`}
                        type="button"
                        onClick={() => setPreviewDocument(doc)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-primary/10 border transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate max-w-[200px]">{doc.nombre}</span>
                        <a
                          href={documentUrls[doc.path] || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); if (!documentUrls[doc.path]) e.preventDefault(); }}
                          className={cn("shrink-0", documentUrls[doc.path] ? "text-muted-foreground hover:text-primary" : "text-muted-foreground/30 cursor-wait")}
                          title="Descargar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {normalizeEnlaces(viewingTutorial.enlaces_sistemas).length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Links a sistemas</h3>
                  <div className="flex flex-wrap gap-2">
                    {normalizeEnlaces(viewingTutorial.enlaces_sistemas).map((enlace, index) => (
                      <a
                        key={`${enlace.url}-${index}`}
                        href={enlace.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-primary/10 border transition-colors text-sm font-medium"
                      >
                        <Link2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate max-w-[200px]">{enlace.nombre}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {normalizeChecklist(viewingTutorial.checklist).length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> Checklist
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full h-8 gap-1.5"
                      onClick={() => downloadChecklistPdf(viewingTutorial.titulo, normalizeChecklist(viewingTutorial.checklist))}
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PDF
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {normalizeChecklist(viewingTutorial.checklist).map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-muted/50 border text-sm">
                        <div className="w-4 h-4 rounded border-2 border-primary/40 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Comentarios, dudas y propuestas de mejora, estilo YouTube */}
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Comentarios
                </h3>
                <Tabs value={activeCommentTab} onValueChange={(v) => setActiveCommentTab(v as TipoComentario)}>
                  <TabsList>
                    <TabsTrigger value="comentario">
                      Comentarios ({comments.filter(c => c.tipo === 'comentario').length})
                    </TabsTrigger>
                    <TabsTrigger value="duda">
                      Dudas ({comments.filter(c => c.tipo === 'duda').length})
                    </TabsTrigger>
                    <TabsTrigger value="mejora">
                      Mejoras ({comments.filter(c => c.tipo === 'mejora').length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                    {userName ? userName[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                    placeholder={
                      newCommentType === 'duda' ? "Escribe tu duda..."
                      : newCommentType === 'mejora' ? "Escribe tu propuesta de mejora..."
                      : "Agrega un comentario..."
                    }
                    className="rounded-xl border-0 border-b-2 border-border rounded-b-none px-1 focus-visible:ring-0 focus-visible:border-primary"
                  />
                  {newComment.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={newCommentType === 'comentario' ? 'default' : 'outline'}
                          className="rounded-full h-7 text-xs"
                          onClick={() => setNewCommentType('comentario')}
                        >
                          Comentario
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={newCommentType === 'duda' ? 'default' : 'outline'}
                          className="rounded-full h-7 text-xs"
                          onClick={() => setNewCommentType('duda')}
                        >
                          Duda
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={newCommentType === 'mejora' ? 'default' : 'outline'}
                          className="rounded-full h-7 text-xs"
                          onClick={() => setNewCommentType('mejora')}
                        >
                          Mejora
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setNewComment("")}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full gap-1.5"
                          disabled={postingComment}
                          onClick={handlePostComment}
                        >
                          {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                          {newCommentType === 'duda' ? 'Preguntar' : newCommentType === 'mejora' ? 'Enviar propuesta' : 'Comentar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {loadingComments ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : visibleComments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {activeCommentTab === 'duda' ? "No hay dudas todavía. Sé el primero en preguntar."
                    : activeCommentTab === 'mejora' ? "No hay propuestas de mejora todavía. Sé el primero en proponer una."
                    : "Sé el primero en comentar este proceso."}
                </p>
              ) : (
                <div className="space-y-5">
                  {visibleComments.map(comment => (
                    <div key={comment.id} className="flex gap-3 group/comment">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                          {comment.autor_nombre ? comment.autor_nombre[0].toUpperCase() : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{comment.autor_nombre}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(comment.fecha_creacion), { addSuffix: true, locale: es })}
                          </span>
                          {comment.tipo === 'duda' && (
                            comment.usuario_id === userId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-6 rounded-full text-[11px] gap-1 px-2 shrink-0",
                                  comment.resuelto ? "text-green-600 hover:text-green-700" : "text-orange-600 hover:text-orange-700"
                                )}
                                onClick={() => handleToggleResuelto(comment)}
                              >
                                {comment.resuelto ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                                {comment.resuelto ? "Resuelta" : "Marcar como resuelta"}
                              </Button>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "h-5 rounded-full text-[10px] gap-1 px-2 shrink-0 border-none",
                                  comment.resuelto ? "bg-green-600/10 text-green-600" : "bg-orange-600/10 text-orange-600"
                                )}
                              >
                                {comment.resuelto ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                                {comment.resuelto ? "Resuelta" : "Pendiente"}
                              </Badge>
                            )
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{comment.contenido}</p>
                      </div>
                      {comment.usuario_id === userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: videos relacionados de la misma categoría, estilo Netflix/YouTube */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
              Más de {viewingTutorial.modulo.categoria.nombre}
            </h3>
            {relatedTutorials.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No hay más videos en esta categoría todavía.</p>
            ) : (
              <div className="space-y-1">
                {relatedTutorials.map(related => (
                  <button
                    key={related.id}
                    onClick={() => setViewingTutorial(related)}
                    className="flex gap-3 w-full text-left p-2 rounded-xl hover:bg-muted/60 transition-colors group/related"
                  >
                    <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                      {!related.es_espacio && related.url_video ? (
                        <Image
                          src={related.miniatura_url || "https://picsum.photos/seed/placeholder/600/400"}
                          alt=""
                          fill
                          loading="lazy"
                          sizes="144px"
                          className="object-cover group-hover/related:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                          <Clock9 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        {!related.es_espacio ? formatDuration(related.duracion_segundos) : "Pte."}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-2 leading-snug group-hover/related:text-primary transition-colors">
                        {related.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{related.modulo?.nombre}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
          <DialogContent className="max-w-3xl h-[85vh] rounded-2xl flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{previewDocument?.nombre}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 bg-muted/30">
              {previewDocument && (() => {
                const previewUrl = documentUrls[previewDocument.path];
                if (!previewUrl) {
                  return (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  );
                }

                const kind = getDocumentPreviewKind(previewDocument.nombre);
                if (kind === 'pdf') {
                  return <iframe src={previewUrl} className="w-full h-full border-0" title={previewDocument.nombre} />;
                }
                if (kind === 'image') {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img src={previewUrl} alt={previewDocument.nombre} className="max-w-full max-h-full object-contain rounded-lg" />
                    </div>
                  );
                }
                if (kind === 'office') {
                  return (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                      className="w-full h-full border-0"
                      title={previewDocument.nombre}
                    />
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                    <FileText className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No hay vista previa disponible para este tipo de archivo.</p>
                    <Button asChild className="rounded-xl">
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" /> Descargar
                      </a>
                    </Button>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/70 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center gap-3 md:gap-6">
          {/* Marca. En móvil se reemplaza por el buscador cuando está activo. */}
          <button
            onClick={() => { setSelectedCategory("all"); setSearch(""); }}
            className={cn("items-center gap-2.5 shrink-0 whitespace-nowrap", showMobileSearch ? "hidden md:flex" : "flex")}
          >
            <div className="bg-primary p-1.5 rounded-lg"><Video className="w-5 h-5 text-primary-foreground" /></div>
            <span className="block text-lg font-bold tracking-tight leading-none">Inmatmex University</span>
          </button>

          {/* Buscador central, estilo YouTube. En móvil solo se muestra al tocar "Buscar" en el navbar inferior. */}
          <div className={cn("flex-1 justify-center min-w-0", showMobileSearch ? "flex" : "hidden md:flex")}>
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar procesos..."
                className="pl-10 pr-10 h-10 rounded-full bg-muted/40 border-border/60 focus-visible:bg-background transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus={showMobileSearch}
              />
              {showMobileSearch && (
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="hidden md:flex items-center gap-1.5 md:gap-2 shrink-0">
            <Button
              onClick={() => router.push('/upload')}
              className="rounded-full shadow-sm h-9 px-3 md:px-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline text-xs font-semibold">Nuevo</span>
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/admin')}
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gestionar Estructura</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelp(true)}
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ayuda</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                      {userEmail ? userEmail[0].toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground">Sesión iniciada como</p>
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer rounded-lg">
                  <Layers className="mr-2 h-4 w-4" /> Gestionar Estructura
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowHelp(true)} className="cursor-pointer rounded-lg">
                  <HelpCircle className="mr-2 h-4 w-4" /> Ayuda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-6 py-2 flex flex-col md:flex-row items-center gap-4">
          <div
            className={cn(
              "relative flex-1 w-full md:w-auto min-w-0 transition-[padding]",
              canScrollLeft && "pl-8",
              canScrollRight && "pr-8"
            )}
          >
            {canScrollLeft && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-7 z-[1] bg-gradient-to-r from-muted/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-[2] h-7 w-7 rounded-full bg-card border shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            )}

            <div
              ref={categoryScrollRef}
              onScroll={checkCategoryScroll}
              className="overflow-x-auto no-scrollbar flex gap-2 items-center w-full"
            >
              <Button variant={selectedCategory === "all" ? "default" : "ghost"} size="sm" className="rounded-full shrink-0" onClick={() => setSelectedCategory("all")}>Todas las Categorías</Button>
              {loadingCategories ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                categories.map(cat => (
                  <Button key={cat} variant={selectedCategory === cat ? "default" : "ghost"} size="sm" className="rounded-full shrink-0" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                ))
              )}
            </div>

            {canScrollRight && (
              <>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 z-[1] bg-gradient-to-l from-muted/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-[2] h-7 w-7 rounded-full bg-card border shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          
          <div className="shrink-0 flex items-center bg-card rounded-xl p-1 shadow-sm border">
            <Button 
              variant={selectedType === "all" ? "secondary" : "ghost"} 
              size="sm" 
              className="rounded-lg px-3 h-8 text-[10px] font-bold uppercase tracking-wider" 
              onClick={() => setSelectedType("all")}
            >
              Todos
            </Button>
            <Button 
              variant={selectedType === "software" ? "primary" : "ghost"} 
              size="sm" 
              className={cn(
                "rounded-lg px-3 h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5",
                selectedType === "software" && "bg-primary text-primary-foreground shadow-sm"
              )} 
              onClick={() => setSelectedType("software")}
            >
              <Monitor className="w-3 h-3" /> Software
            </Button>
            <Button 
              variant={selectedType === "operacion" ? "accent" : "ghost"} 
              size="sm" 
              className={cn(
                "rounded-lg px-3 h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5",
                selectedType === "operacion" && "bg-accent text-accent-foreground shadow-sm"
              )} 
              onClick={() => setSelectedType("operacion")}
            >
              <Settings className="w-3 h-3" /> Operativo
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 flex-1">
        <div className="mb-12 space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              {selectedCategory === "all" ? "Todos los Procesos" : `Procesos de ${selectedCategory}`}
            </h2>
            {selectedType !== "all" && (
              <Badge variant="secondary" className="rounded-lg px-3 py-1 font-bold uppercase tracking-widest text-[10px] bg-primary/20 text-primary border-none">
                Filtrado por: {selectedType === 'software' ? 'Software' : 'Operativo'}
              </Badge>
            )}
            {!loading && <Badge variant="outline" className="font-mono text-sm">{filteredTutorials.length}</Badge>}
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Info className="w-4 h-4" />
            {selectedCategory === "all" ? "Vista general organizada por departamentos." : "Listado detallado de los módulos de trabajo."}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : filteredTutorials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 bg-muted/50 rounded-full mb-4">
              <Filter className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-semibold">Sin resultados</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">No encontramos procesos que coincidan con los filtros seleccionados.</p>
            <Button variant="link" className="mt-4" onClick={() => { setSearch(""); setSelectedCategory("all"); setSelectedType("all"); }}>Limpiar todos los filtros</Button>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(groupedTutorials).map(([groupName, subgroups]) => {
              const groupTutorials = Object.values(subgroups).flat();
              const subgroupEntries = Object.entries(subgroups);
              const hasSubcategories = subgroupEntries.length > 1 || subgroupEntries[0]?.[0] !== NO_SUBCATEGORY;

              const isCollapsed = !!collapsedGroups[groupName];

              return (
                <div key={groupName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4 mb-6 w-full">
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center gap-4 flex-1 min-w-0 text-left group/header"
                    >
                      <div className="bg-primary/10 p-2 rounded-lg">
                        {selectedCategory === "all" ? <FolderOpen className="w-5 h-5 text-primary" /> : <Layers className="w-5 h-5 text-primary" />}
                      </div>
                      <h3 className="text-xl font-bold text-foreground/90 uppercase tracking-tight">{groupName}</h3>
                      <Separator className="flex-1" />
                      <Badge variant="outline" className="font-mono">{groupTutorials.length}</Badge>
                      <ChevronDown
                        className={cn(
                          "w-5 h-5 text-muted-foreground transition-transform group-hover/header:text-primary",
                          isCollapsed ? "-rotate-90" : ""
                        )}
                      />
                    </button>
                    {selectedCategory !== "all" && groupTutorials[0]?.modulo?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full gap-1.5 shrink-0 border-primary/20 hover:bg-primary/5"
                        onClick={() => router.push(`/examen/${groupTutorials[0].modulo.id}`)}
                      >
                        <GraduationCap className="w-4 h-4 text-primary" /> Rendir Examen
                      </Button>
                    )}
                  </div>

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-in-out",
                      isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                    )}
                  >
                    <div
                      className={cn(
                        "overflow-hidden transition-opacity duration-300",
                        isCollapsed ? "opacity-0" : "opacity-100 delay-100"
                      )}
                    >
                      {hasSubcategories ? (
                        <div className="space-y-10 pl-6 border-l-2 border-primary/10 ml-5">
                          {subgroupEntries.map(([subgroupName, subgroupTutorials]) => (
                            <div key={subgroupName}>
                              <div className="flex items-center gap-3 mb-4">
                                <Tag className="w-4 h-4 text-muted-foreground" />
                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                  {subgroupName === NO_SUBCATEGORY ? "General" : subgroupName}
                                </h4>
                                <Badge variant="secondary" className="font-mono text-[10px] bg-muted">{subgroupTutorials.length}</Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {subgroupTutorials.map(renderTutorialCard)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {groupTutorials.map(renderTutorialCard)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <DialogHeader className="relative z-10">
            <div className="mx-auto bg-primary/20 p-4 rounded-3xl w-fit mb-4">
              <HelpCircle className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-extrabold text-center">¡Bienvenido al Gestor!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Sigue estos sencillos pasos para comenzar a alimentar tu base de conocimiento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-6 relative z-10">
            <div className="flex gap-4 items-start">
              <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">1</div>
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  Gestionar Estructura <Layers className="w-3 h-3 text-primary" />
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Primero ingresa al botón de <strong>Gestionar Estructura</strong>. En caso de no existir una categoría y un módulo para tu proceso, créalos en esa sección.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">2</div>
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  Subir Nuevo Proceso <Plus className="w-3 h-3 text-primary" />
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Utiliza el botón <strong>Nuevo</strong> para registrar el tutorial. Puedes subir el video ahora o crear un <strong>Espacio</strong> para cargarlo más tarde.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">3</div>
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  Clasificación Inteligente <CheckCircle2 className="w-3 h-3 text-primary" />
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Clasifica tus videos como <strong>Software</strong> u <strong>Operativo</strong> para que tus compañeros encuentren lo que necesitan más rápido.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <Button onClick={() => setShowHelp(false)} className="w-full rounded-2xl h-12 shadow-lg shadow-primary/20 font-bold group">
              ¡Entendido, vamos allá!
              <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Confirmar eliminación</DialogTitle>
            <DialogDescription className="text-center">
              Ingresa la contraseña para eliminar este video. Es un candado temporal mientras se define el sistema de permisos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Contraseña"
              value={deletePassword}
              onChange={e => { setDeletePassword(e.target.value); setDeletePasswordError(""); }}
              onKeyDown={e => { if (e.key === 'Enter') confirmDelete(); }}
              className="rounded-xl"
              autoFocus
            />
            {deletePasswordError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {deletePasswordError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setDeleteTargetId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={confirmDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </TooltipProvider>
  );
}
