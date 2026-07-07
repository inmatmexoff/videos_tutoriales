"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  CheckCircle2,
  FolderOpen,
  Clock9,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";

interface Tutorial {
  id: number;
  titulo: string;
  descripcion: string;
  url_video: string;
  miniatura_url: string;
  duracion_segundos: number;
  modulo: {
    nombre: string;
    categoria: {
      nombre: string;
    }
  }
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
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewingTutorial, setViewingTutorial] = useState<Tutorial | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabasePROD
        .from('tutoriales')
        .select(`
          id, titulo, descripcion, url_video, miniatura_url, duracion_segundos,
          modulo:modulos_tutoriales (
            nombre,
            categoria:categorias_tutoriales (nombre)
          )
        `)
        .eq('activo', true)
        .order('fecha_creacion', { ascending: false });

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
      return matchesSearch && matchesCategory;
    });
  }, [tutorials, search, selectedCategory]);

  const groupedTutorials = useMemo(() => {
    const groups: Record<string, Tutorial[]> = {};
    filteredTutorials.forEach(t => {
      const groupName = selectedCategory === "all" 
        ? (t.modulo?.categoria?.nombre || "General")
        : (t.modulo?.nombre || "General");

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(t);
    });
    return groups;
  }, [filteredTutorials, selectedCategory]);

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabasePROD.from('tutoriales').update({ activo: false }).eq('id', id);
      if (error) throw error;
      setTutorials(prev => prev.filter(t => t.id !== id));
      toast({ title: "Tutorial eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error" });
    }
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

  if (viewingTutorial) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => setViewingTutorial(null)} className="mb-6 rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
        </Button>
        <div className="max-w-5xl mx-auto space-y-6">
          {viewingTutorial.url_video ? (
            <div className="aspect-video bg-black rounded-3xl overflow-hidden relative shadow-2xl ring-1 ring-border group">
              <video src={viewingTutorial.url_video} className="w-full h-full object-contain" controls autoPlay playsInline />
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
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold">{viewingTutorial.titulo}</h1>
                <p className="text-primary font-medium">{viewingTutorial.modulo.nombre}</p>
              </div>
              <Badge variant="outline" className="px-4 py-1 text-lg rounded-full">{viewingTutorial.modulo.categoria.nombre}</Badge>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">{viewingTutorial.descripcion}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl"><Video className="w-6 h-6 text-primary-foreground" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestor de Procesos</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Base de Conocimiento</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin')} 
              className="rounded-xl border-primary/20 hover:bg-primary/5 gap-2 px-4 h-10"
            >
              <Layers className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline font-medium text-xs">Gestionar Estructura</span>
            </Button>
            
            <Button onClick={() => router.push('/upload')} className="rounded-xl shadow-lg shadow-primary/20 h-10 px-4">
              <Plus className="mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline text-xs">Nuevo</span>
            </Button>

            <div className="flex items-center gap-2 bg-muted/30 p-1 pl-3 rounded-full border border-border/50">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowHelp(true)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              {userEmail && (
                <Badge variant="secondary" className="hidden sm:flex rounded-full px-3 py-1 bg-primary/10 text-primary border-none text-[10px]">
                  {userEmail}
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-muted/20 overflow-hidden">
        <div className="container mx-auto px-6 py-2 overflow-x-auto no-scrollbar flex gap-2 items-center">
          <Button variant={selectedCategory === "all" ? "default" : "ghost"} size="sm" className="rounded-full shrink-0" onClick={() => setSelectedCategory("all")}>Todos</Button>
          {loadingCategories ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : categories.map(cat => (
            <Button key={cat} variant={selectedCategory === cat ? "default" : "ghost"} size="sm" className="rounded-full shrink-0" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 flex-1">
        <div className="mb-12 space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            {selectedCategory === "all" ? "Todos los Procesos" : `Procesos de ${selectedCategory}`}
            {!loading && <Badge variant="secondary" className="ml-2 font-mono">{filteredTutorials.length}</Badge>}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Info className="w-4 h-4" /> 
            {selectedCategory === "all" ? "Vista general por categorías del sistema." : "Listado detallado por módulos de trabajo."}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : filteredTutorials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center"><Search className="w-12 h-12 text-muted-foreground mb-4" /><h3 className="text-xl font-semibold">Sin resultados</h3></div>
        ) : (
          <div className="space-y-16">
            {Object.entries(groupedTutorials).map(([groupName, groupTutorials]) => (
              <div key={groupName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    {selectedCategory === "all" ? <FolderOpen className="w-5 h-5 text-primary" /> : <Layers className="w-5 h-5 text-primary" />}
                  </div>
                  <h3 className="text-xl font-bold text-foreground/90 uppercase tracking-tight">{groupName}</h3>
                  <Separator className="flex-1" />
                  <Badge variant="outline" className="font-mono">{groupTutorials.length}</Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {groupTutorials.map((tutorial) => (
                    <Card key={tutorial.id} className="group overflow-hidden rounded-2xl border-none ring-1 ring-border bg-card/50 hover:ring-primary/50 transition-all duration-300">
                      <div className="relative aspect-video overflow-hidden">
                        <img 
                          src={tutorial.miniatura_url || "https://picsum.photos/seed/placeholder/600/400"} 
                          alt="" 
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" className="rounded-full h-12 w-12 p-0 shadow-xl" onClick={() => setViewingTutorial(tutorial)}>
                            {tutorial.url_video ? <Play className="fill-current w-5 h-5" /> : <Info className="w-5 h-5" />}
                          </Button>
                        </div>
                        
                        {!tutorial.url_video && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-orange-500 hover:bg-orange-600 border-none rounded-lg flex items-center gap-1 shadow-lg">
                              <AlertCircle className="w-3 h-3" /> Espacio Creado
                            </Badge>
                          </div>
                        )}

                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {tutorial.url_video ? formatDuration(tutorial.duracion_segundos) : "Pte. Video"}
                        </div>
                      </div>
                      <CardHeader className="p-5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold w-fit bg-primary/10 text-primary border-none">
                              {selectedCategory === "all" ? tutorial.modulo?.nombre : tutorial.modulo?.categoria?.nombre}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl">
                              <DropdownMenuItem onClick={() => router.push(`/edit/${tutorial.id}`)} className="cursor-pointer rounded-lg">
                                <Edit2 className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive cursor-pointer rounded-lg" onClick={() => handleDelete(tutorial.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardTitle className="text-lg font-bold mt-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {tutorial.titulo}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
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
                  Organización Automática <CheckCircle2 className="w-3 h-3 text-primary" />
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ¡Listo! Tu video aparecerá organizado por categorías en la vista general o por módulos al filtrar por categoría.
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
    </div>
  );
}
