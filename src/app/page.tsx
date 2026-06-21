
"use client";

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Play, 
  Edit2, 
  Trash2, 
  Video, 
  Clock, 
  Tag, 
  MoreVertical,
  ArrowLeft,
  LayoutGrid,
  List as ListIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

// Types
interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  videoUrl: string;
  thumbnail: string;
}

const CATEGORIES = ["Seguridad", "Administración", "Finanzas", "Soporte Técnico", "Recursos Humanos"];

const INITIAL_TUTORIALS: Tutorial[] = [
  {
    id: "1",
    title: "Restablecimiento de Contraseña de Administrador",
    description: "Guía paso a paso sobre cómo restablecer las credenciales de administrador de forma segura utilizando la consola central.",
    category: "Seguridad",
    duration: "05:20",
    videoUrl: "https://www.youtube.com/watch?v=sample1",
    thumbnail: "https://picsum.photos/seed/system1/600/400"
  },
  {
    id: "2",
    title: "Cierre de Mes Contable",
    description: "Procedimiento estándar para validar y cerrar el periodo contable en el módulo de finanzas.",
    category: "Finanzas",
    duration: "12:45",
    videoUrl: "https://www.youtube.com/watch?v=sample2",
    thumbnail: "https://picsum.photos/seed/system2/600/400"
  },
  {
    id: "3",
    title: "Alta de Nuevo Colaborador",
    description: "Cómo registrar un nuevo empleado en el sistema y asignar los permisos iniciales.",
    category: "Recursos Humanos",
    duration: "08:15",
    videoUrl: "https://www.youtube.com/watch?v=sample3",
    thumbnail: "https://picsum.photos/seed/system3/600/400"
  }
];

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>(INITIAL_TUTORIALS);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<Partial<Tutorial> | null>(null);
  const [viewingTutorial, setViewingTutorial] = useState<Tutorial | null>(null);
  const { toast } = useToast();

  const filteredTutorials = useMemo(() => {
    return tutorials.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                           t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tutorials, search, selectedCategory]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTutorial?.title || !currentTutorial?.category) return;

    if (currentTutorial.id) {
      setTutorials(prev => prev.map(t => t.id === currentTutorial.id ? currentTutorial as Tutorial : t));
      toast({ title: "Tutorial actualizado", description: "Los cambios han sido guardados correctamente." });
    } else {
      const newTutorial = {
        ...currentTutorial,
        id: Math.random().toString(36).substr(2, 9),
        thumbnail: `https://picsum.photos/seed/${Math.random()}/600/400`,
        duration: currentTutorial.duration || "00:00"
      } as Tutorial;
      setTutorials(prev => [newTutorial, ...prev]);
      toast({ title: "Tutorial creado", description: "El nuevo video ha sido añadido al sistema." });
    }
    setIsDialogOpen(false);
    setCurrentTutorial(null);
  };

  const handleDelete = (id: string) => {
    setTutorials(prev => prev.filter(t => t.id !== id));
    toast({ title: "Tutorial eliminado", description: "El video ha sido removido del sistema." });
  };

  const openAddDialog = () => {
    setCurrentTutorial({ title: "", description: "", category: "Administración", videoUrl: "", duration: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (tutorial: Tutorial) => {
    setCurrentTutorial(tutorial);
    setIsDialogOpen(true);
  };

  if (viewingTutorial) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => setViewingTutorial(null)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
        </Button>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="aspect-video bg-black rounded-3xl overflow-hidden flex items-center justify-center relative shadow-2xl">
            <Play className="w-20 h-20 text-white/50" />
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-white text-sm">
              Vista Previa del Sistema
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold">{viewingTutorial.title}</h1>
              <Badge variant="outline" className="px-4 py-1 text-lg">{viewingTutorial.category}</Badge>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {viewingTutorial.description}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Duración: {viewingTutorial.duration}</div>
              <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Fuente: Sistema Interno</div>
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
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Video Tutoriales del Sistema</p>
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
            <Button onClick={openAddDialog} className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Video
            </Button>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-6 py-2 overflow-x-auto no-scrollbar flex gap-2">
          <Button 
            variant={selectedCategory === "all" ? "default" : "ghost"} 
            size="sm" 
            className="rounded-full"
            onClick={() => setSelectedCategory("all")}
          >
            Todos
          </Button>
          {CATEGORIES.map(cat => (
            <Button 
              key={cat} 
              variant={selectedCategory === cat ? "default" : "ghost"} 
              size="sm" 
              className="rounded-full"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 flex-1">
        {filteredTutorials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-muted p-6 rounded-full">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">No se encontraron videos</h3>
              <p className="text-muted-foreground">Prueba ajustando los filtros o creando uno nuevo.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="group overflow-hidden rounded-2xl border-none ring-1 ring-border bg-card/50 hover:ring-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={tutorial.thumbnail} 
                    alt={tutorial.title}
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
                    {tutorial.duration}
                  </div>
                </div>
                
                <CardHeader className="p-4 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight">
                      {tutorial.category}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(tutorial)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tutorial.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg font-bold line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                    {tutorial.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="px-4 py-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {tutorial.description}
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

      {/* CRUD Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {currentTutorial?.id ? 'Editar Tutorial' : 'Nuevo Tutorial'}
              </DialogTitle>
              <DialogDescription>
                Completa los detalles del proceso para que el equipo pueda aprenderlo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="title">Título del Proceso</Label>
                <Input 
                  id="title" 
                  value={currentTutorial?.title || ""} 
                  onChange={e => setCurrentTutorial(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Conciliación bancaria diaria"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select 
                    value={currentTutorial?.category || ""} 
                    onValueChange={v => setCurrentTutorial(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duración (MM:SS)</Label>
                  <Input 
                    id="duration" 
                    value={currentTutorial?.duration || ""} 
                    onChange={e => setCurrentTutorial(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="05:30"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción detallada</Label>
                <Textarea 
                  id="description" 
                  value={currentTutorial?.description || ""} 
                  onChange={e => setCurrentTutorial(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Explica brevemente qué se cubre en este video..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">URL del Video (Youtube/Interno)</Label>
                <Input 
                  id="url" 
                  value={currentTutorial?.videoUrl || ""} 
                  onChange={e => setCurrentTutorial(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl px-8 shadow-lg shadow-primary/20">
                {currentTutorial?.id ? 'Guardar Cambios' : 'Publicar Video'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sistema Interno de Capacitación - Procesos Optimizados.
        </div>
      </footer>
    </div>
  );
}
