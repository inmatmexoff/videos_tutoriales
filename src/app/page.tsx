
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
  ExternalLink,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";

// Types
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
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewingTutorial, setViewingTutorial] = useState<Tutorial | null>(null);
  const { toast } = useToast();

  // Fetch tutoriales desde Supabase
  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabasePROD
        .from('tutoriales')
        .select(`
          id,
          titulo,
          descripcion,
          url_video,
          miniatura_url,
          duracion_segundos,
          modulo:modulos_tutoriales (
            nombre,
            categoria:categorias_tutoriales (
              nombre
            )
          )
        `)
        .eq('activo', true)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setTutorials(data as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar tutoriales",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch categorías para el filtro
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoadingCategories(true);
        const { data, error } = await supabasePROD
          .from('categorias_tutoriales')
          .select('nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (error) throw error;
        if (data) setCategories(data.map(cat => cat.nombre));
      } catch (error: any) {
        console.error("Error categories:", error.message);
      } finally {
        setLoadingCategories(false);
      }
    }

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

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabasePROD
        .from('tutoriales')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      
      setTutorials(prev => prev.filter(t => t.id !== id));
      toast({ title: "Tutorial eliminado", description: "El video ha sido removido del sistema." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el tutorial." });
    }
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
          <div className="aspect-video bg-black rounded-3xl overflow-hidden flex items-center justify-center relative shadow-2xl ring-1 ring-border">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
              <Play className="w-20 h-20" />
              <p className="font-medium">Reproductor Externo Configurado</p>
              <Button asChild variant="secondary" className="rounded-full">
                <a href={viewingTutorial.url_video} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir Video Original
                </a>
              </Button>
            </div>
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-white text-sm">
              {viewingTutorial.modulo.categoria.nombre} • {viewingTutorial.modulo.nombre}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold">{viewingTutorial.titulo}</h1>
                <p className="text-primary font-medium">{viewingTutorial.modulo.nombre}</p>
              </div>
              <Badge variant="outline" className="px-4 py-1 text-lg rounded-full">
                {viewingTutorial.modulo.categoria.nombre}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {viewingTutorial.descripcion}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Duración: {formatDuration(viewingTutorial.duracion_segundos)}</div>
              <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Fuente: Sistema de Tutoriales</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestor de Procesos</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Base de Conocimiento</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar tutorial..." 
                className="pl-9 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => router.push('/upload')} className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Subir Video
            </Button>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="border-b bg-muted/20 overflow-hidden">
        <div className="container mx-auto px-6 py-2 overflow-x-auto no-scrollbar flex gap-2 items-center">
          <Button 
            variant={selectedCategory === "all" ? "default" : "ghost"} 
            size="sm" 
            className="rounded-full shrink-0"
            onClick={() => setSelectedCategory("all")}
          >
            Todos
          </Button>
          {loadingCategories ? (
            <div className="flex items-center gap-2 px-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sincronizando...</span>
            </div>
          ) : (
            categories.map(cat => (
              <Button 
                key={cat} 
                variant={selectedCategory === cat ? "default" : "ghost"} 
                size="sm" 
                className="rounded-full shrink-0"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 flex-1">
        {/* Dynamic Title based on Selection */}
        <div className="mb-8 space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            {selectedCategory === "all" ? "Todos los Procesos" : `Procesos de ${selectedCategory}`}
            {!loading && <Badge variant="secondary" className="ml-2 font-mono">{filteredTutorials.length}</Badge>}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4" />
            Explora los videotutoriales y guías del sistema para optimizar tu flujo de trabajo.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Cargando tutoriales...</p>
          </div>
        ) : filteredTutorials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-muted p-6 rounded-full">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">No se encontraron videos</h3>
              <p className="text-muted-foreground">Prueba ajustando los filtros o registra un nuevo video para esta categoría.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="group overflow-hidden rounded-2xl border-none ring-1 ring-border bg-card/50 hover:ring-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={tutorial.miniatura_url || "https://picsum.photos/seed/placeholder/600/400"} 
                    alt={tutorial.titulo}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="secondary" 
                      className="rounded-full h-12 w-12 p-0"
                      onClick={() => setViewingTutorial(tutorial)}
                    >
                      <Play className="fill-current" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    {formatDuration(tutorial.duracion_segundos)}
                  </div>
                </div>
                
                <CardHeader className="p-4 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight w-fit">
                        {tutorial.modulo?.categoria?.nombre || "General"}
                      </Badge>
                      <span className="text-[10px] text-primary font-bold">{tutorial.modulo?.nombre || "Módulo"}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tutorial.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg font-bold line-clamp-1 leading-tight group-hover:text-primary transition-colors mt-2">
                    {tutorial.titulo}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="px-4 py-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {tutorial.descripcion}
                  </p>
                </CardContent>
                
                <CardFooter className="p-4 flex gap-2">
                  <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => setViewingTutorial(tutorial)}>
                    Ver Tutorial
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sistema Interno de Capacitación - Procesos Optimizados.
        </div>
      </footer>
    </div>
  );
}
