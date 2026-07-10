"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  FolderPlus,
  Layers,
  Save,
  Loader2,
  Tag,
  Boxes,
  Video,
  Edit2,
  Trash2,
  X,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}

function AdminContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  
  // Estados para creación
  const [catData, setCatData] = useState({ nombre: "", descripcion: "" });
  const [modData, setModData] = useState({ categoriaId: "", nombre: "", descripcion: "" });
  const [subcatData, setSubcatData] = useState({ categoriaId: "", moduloId: "", nombre: "", descripcion: "" });

  // Estados para edición de categoría
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatData, setEditCatData] = useState({ nombre: "", descripcion: "" });

  // Módulos disponibles para asignar una subcategoría (dependen de la categoría elegida)
  const [modulesForSubcat, setModulesForSubcat] = useState<any[]>([]);
  const [loadingModulesForSubcat, setLoadingModulesForSubcat] = useState(false);

  const fetchCategories = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabasePROD
        .from('categorias_tutoriales')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al cargar", description: error.message });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchModulesForSubcat() {
      if (!subcatData.categoriaId) {
        setModulesForSubcat([]);
        return;
      }
      try {
        setLoadingModulesForSubcat(true);
        const { data, error } = await supabasePROD
          .from('modulos_tutoriales')
          .select('id, nombre')
          .eq('categoria_id', subcatData.categoriaId)
          .eq('activo', true)
          .order('nombre', { ascending: true });
        if (error) throw error;
        setModulesForSubcat(data || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los módulos." });
      } finally {
        setLoadingModulesForSubcat(false);
      }
    }
    fetchModulesForSubcat();
  }, [subcatData.categoriaId, toast]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabasePROD
        .from('categorias_tutoriales')
        .insert([{
          nombre: catData.nombre,
          descripcion: catData.descripcion,
          orden: 0,
          creado_por: user.id
        }]);

      if (error) throw error;
      toast({ title: "Categoría creada", description: `Se ha registrado "${catData.nombre}"` });
      setCatData({ nombre: "", descripcion: "" });
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (id: number) => {
    setLoading(true);
    try {
      const { error } = await supabasePROD
        .from('categorias_tutoriales')
        .update({
          nombre: editCatData.nombre,
          descripcion: editCatData.descripcion
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Categoría actualizada" });
      setEditingCatId(null);
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setLoading(true);
    try {
      // Soft delete para mantener integridad de tutoriales vinculados
      const { error } = await supabasePROD
        .from('categorias_tutoriales')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Categoría eliminada" });
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modData.categoriaId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabasePROD
        .from('modulos_tutoriales')
        .insert([{
          categoria_id: parseInt(modData.categoriaId),
          nombre: modData.nombre,
          descripcion: modData.descripcion,
          orden: 0,
          creado_por: user.id
        }]);

      if (error) throw error;
      toast({ title: "Módulo creado", description: `Se ha registrado "${modData.nombre}"` });
      setModData({ categoriaId: modData.categoriaId, nombre: "", descripcion: "" });
      setShowModuleDialog(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatData.moduloId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabasePROD
        .from('subcategorias_tutoriales')
        .insert([{
          modulo_id: parseInt(subcatData.moduloId),
          nombre: subcatData.nombre,
          descripcion: subcatData.descripcion,
          orden: 0,
          creado_por: user.id
        }]);

      if (error) throw error;
      toast({ title: "Subcategoría creada", description: `Se ha registrado "${subcatData.nombre}"` });
      setSubcatData(prev => ({ ...prev, nombre: "", descripcion: "" }));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (cat: any) => {
    setEditingCatId(cat.id);
    setEditCatData({ nombre: cat.nombre, descripcion: cat.descripcion || "" });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
        </Button>

        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Gestión de Estructura</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/orden')}
            className="rounded-xl border-primary/20 hover:bg-primary/5 gap-2"
          >
            <ArrowUpDown className="w-4 h-4 text-primary" /> Ordenar Videos
          </Button>
        </div>

        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl h-12">
            <TabsTrigger value="categorias" className="rounded-lg">Categorías</TabsTrigger>
            <TabsTrigger value="modulos" className="rounded-lg">Módulos</TabsTrigger>
            <TabsTrigger value="subcategorias" className="rounded-lg">Subcategorías</TabsTrigger>
          </TabsList>

          <TabsContent value="categorias" className="mt-6 space-y-6">
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" /> Nueva Categoría
                </CardTitle>
                <CardDescription>Crea contenedores principales para tus procesos.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateCategory}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-nombre">Nombre de Categoría</Label>
                    <Input 
                      id="cat-nombre" 
                      placeholder="Ej: Recursos Humanos" 
                      value={catData.nombre}
                      onChange={e => setCatData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-desc">Descripción (Opcional)</Label>
                    <Input 
                      id="cat-desc" 
                      placeholder="Breve detalle..." 
                      value={catData.descripcion}
                      onChange={e => setCatData(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={loading} className="w-full rounded-xl">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Categoría
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Listado de Categorías</CardTitle>
                <CardDescription>Administra las categorías existentes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fetching ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : categories.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No hay categorías registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-4 border rounded-2xl bg-background/50 group transition-all hover:border-primary/50">
                        {editingCatId === cat.id ? (
                          <div className="flex-1 space-y-3 mr-4">
                            <Input 
                              value={editCatData.nombre} 
                              onChange={e => setEditCatData(p => ({ ...p, nombre: e.target.value }))}
                              className="rounded-lg h-8"
                              placeholder="Nombre"
                            />
                            <Input 
                              value={editCatData.descripcion} 
                              onChange={e => setEditCatData(p => ({ ...p, descripcion: e.target.value }))}
                              className="rounded-lg h-8"
                              placeholder="Descripción"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-bold">{cat.nombre}</span>
                            <span className="text-xs text-muted-foreground">{cat.descripcion || "Sin descripción"}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {editingCatId === cat.id ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleEditCategory(cat.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingCatId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => startEditing(cat)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" 
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modulos" className="mt-6">
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" /> Nuevo Módulo
                </CardTitle>
                <CardDescription>Asigna submódulos a las categorías existentes.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateModule}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categoría Padre</Label>
                    <Select 
                      value={modData.categoriaId} 
                      onValueChange={v => setModData(prev => ({ ...prev, categoriaId: v }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-nombre">Nombre del Módulo</Label>
                    <Input 
                      id="mod-nombre" 
                      placeholder="Ej: Reclutamiento" 
                      value={modData.nombre}
                      onChange={e => setModData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-desc">Descripción</Label>
                    <Input 
                      id="mod-desc" 
                      placeholder="Propósito del módulo..." 
                      value={modData.descripcion}
                      onChange={e => setModData(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={loading || !modData.categoriaId} className="w-full rounded-xl">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Módulo
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="subcategorias" className="mt-6">
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-primary" /> Nueva Subcategoría
                </CardTitle>
                <CardDescription>
                  Divide un módulo en secciones (ej: dentro de "Impresión de Etiquetas" crea "Mercado Libre", "Walmart", "Amazon"). Es opcional: solo los módulos que la necesiten tendrán subcategorías.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateSubcategory}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={subcatData.categoriaId}
                      onValueChange={v => setSubcatData(prev => ({ ...prev, categoriaId: v, moduloId: "" }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Módulo Padre</Label>
                    <Select
                      value={subcatData.moduloId}
                      onValueChange={v => setSubcatData(prev => ({ ...prev, moduloId: v }))}
                      disabled={!subcatData.categoriaId}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={loadingModulesForSubcat ? "Cargando..." : "Selecciona módulo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {modulesForSubcat.map(mod => (
                          <SelectItem key={mod.id} value={mod.id.toString()}>{mod.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcat-nombre">Nombre de Subcategoría</Label>
                    <Input
                      id="subcat-nombre"
                      placeholder="Ej: Mercado Libre"
                      value={subcatData.nombre}
                      onChange={e => setSubcatData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcat-desc">Descripción (Opcional)</Label>
                    <Input
                      id="subcat-desc"
                      placeholder="Breve detalle..."
                      value={subcatData.descripcion}
                      onChange={e => setSubcatData(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={loading || !subcatData.moduloId} className="w-full rounded-xl">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Subcategoría
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Módulo Registrado
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Qué deseas hacer a continuación? Puedes seguir creando más módulos o ir a subir el video para este proceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-none bg-muted hover:bg-muted/80">Seguir Creando</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => router.push('/upload')}
              className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              <Video className="mr-2 h-4 w-4" /> Ir a Subir Video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}