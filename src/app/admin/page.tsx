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
  Check,
  GraduationCap,
  Plus,
  CircleCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { vincularEtiquetaAModulo } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
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

  // Estados para la pestaña de Exámenes
  const [allModules, setAllModules] = useState<any[]>([]);
  const [selectedModuloId, setSelectedModuloId] = useState("");
  const [loadingExamen, setLoadingExamen] = useState(false);
  const [savingExamen, setSavingExamen] = useState(false);
  const [examen, setExamen] = useState<{ id: number; titulo: string; descripcion: string } | null>(null);
  const [examData, setExamData] = useState({ titulo: "", descripcion: "" });
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [newPregunta, setNewPregunta] = useState("");
  const [newOpciones, setNewOpciones] = useState<{ texto: string; es_correcta: boolean }[]>([
    { texto: "", es_correcta: false },
    { texto: "", es_correcta: false },
  ]);
  const [savingPregunta, setSavingPregunta] = useState(false);

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

  useEffect(() => {
    async function fetchAllModules() {
      try {
        const { data, error } = await supabasePROD
          .from('modulos_tutoriales')
          .select('id, nombre, categoria:categorias_tutoriales(nombre)')
          .eq('activo', true)
          .order('nombre', { ascending: true });
        if (error) throw error;
        setAllModules(data || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los módulos." });
      }
    }
    fetchAllModules();
  }, [toast]);

  const fetchPreguntas = async (examenId: number) => {
    try {
      setLoadingPreguntas(true);
      const { data, error } = await supabasePROD
        .from('examen_preguntas')
        .select('*')
        .eq('examen_id', examenId)
        .eq('activo', true)
        .order('orden', { ascending: true });
      if (error) throw error;
      setPreguntas(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las preguntas." });
    } finally {
      setLoadingPreguntas(false);
    }
  };

  useEffect(() => {
    async function fetchExamenData() {
      if (!selectedModuloId) {
        setExamen(null);
        setExamData({ titulo: "", descripcion: "" });
        setPreguntas([]);
        return;
      }
      try {
        setLoadingExamen(true);
        const { data, error } = await supabasePROD
          .from('examenes_modulo')
          .select('id, titulo, descripcion')
          .eq('modulo_id', selectedModuloId)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          setExamen(data);
          setExamData({ titulo: data.titulo, descripcion: data.descripcion || "" });
          fetchPreguntas(data.id);
        } else {
          setExamen(null);
          setExamData({ titulo: "", descripcion: "" });
          setPreguntas([]);
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el examen." });
      } finally {
        setLoadingExamen(false);
      }
    }
    fetchExamenData();
  }, [selectedModuloId, toast]);

  const handleSaveExamen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuloId) return;
    setSavingExamen(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("No autenticado");

      if (examen) {
        const { error } = await supabasePROD
          .from('examenes_modulo')
          .update({ titulo: examData.titulo, descripcion: examData.descripcion })
          .eq('id', examen.id);
        if (error) throw error;
        setExamen(prev => prev ? { ...prev, ...examData } : prev);
        toast({ title: "Examen actualizado" });
      } else {
        const { data, error } = await supabasePROD
          .from('examenes_modulo')
          .insert([{
            modulo_id: parseInt(selectedModuloId),
            titulo: examData.titulo,
            descripcion: examData.descripcion,
            creado_por: user.id
          }])
          .select()
          .single();
        if (error) throw error;
        setExamen(data);
        toast({ title: "Examen creado", description: "Ahora agrega las preguntas." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSavingExamen(false);
    }
  };

  const handleNewOptionChange = (index: number, texto: string) => {
    setNewOpciones(prev => prev.map((op, i) => i === index ? { ...op, texto } : op));
  };

  const handleSetCorrectOption = (index: number) => {
    setNewOpciones(prev => prev.map((op, i) => ({ ...op, es_correcta: i === index })));
  };

  const handleAddOption = () => {
    setNewOpciones(prev => [...prev, { texto: "", es_correcta: false }]);
  };

  const handleRemoveOption = (index: number) => {
    setNewOpciones(prev => prev.length > 2 ? prev.filter((_, i) => i !== index) : prev);
  };

  const resetNewPreguntaForm = () => {
    setNewPregunta("");
    setNewOpciones([{ texto: "", es_correcta: false }, { texto: "", es_correcta: false }]);
  };

  const handleAddPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examen) return;

    const opcionesValidas = newOpciones.filter(op => op.texto.trim());
    if (!newPregunta.trim() || opcionesValidas.length < 2) {
      toast({ variant: "destructive", title: "Completa la pregunta y al menos 2 opciones." });
      return;
    }
    if (!opcionesValidas.some(op => op.es_correcta)) {
      toast({ variant: "destructive", title: "Marca cuál opción es la correcta." });
      return;
    }

    setSavingPregunta(true);
    try {
      const { error } = await supabasePROD
        .from('examen_preguntas')
        .insert([{
          examen_id: examen.id,
          pregunta: newPregunta.trim(),
          opciones: opcionesValidas,
          orden: preguntas.length
        }]);
      if (error) throw error;
      resetNewPreguntaForm();
      fetchPreguntas(examen.id);
      toast({ title: "Pregunta agregada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSavingPregunta(false);
    }
  };

  const handleDeletePregunta = async (preguntaId: number) => {
    try {
      const { error } = await supabasePROD
        .from('examen_preguntas')
        .update({ activo: false })
        .eq('id', preguntaId);
      if (error) throw error;
      setPreguntas(prev => prev.filter(p => p.id !== preguntaId));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

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

      // La etiqueta es global: si "Mercado Libre" ya existe se reusa y solo se
      // vincula a este módulo, en vez de crear un duplicado por módulo.
      await vincularEtiquetaAModulo(subcatData.nombre, parseInt(subcatData.moduloId), user.id);

      toast({ title: "Etiqueta lista", description: `"${subcatData.nombre.trim()}" quedó disponible en este módulo.` });
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
          <TabsList className="grid w-full grid-cols-4 rounded-xl h-12">
            <TabsTrigger value="categorias" className="rounded-lg">Categorías</TabsTrigger>
            <TabsTrigger value="modulos" className="rounded-lg">Módulos</TabsTrigger>
            <TabsTrigger value="subcategorias" className="rounded-lg">Etiquetas</TabsTrigger>
            <TabsTrigger value="examenes" className="rounded-lg">Exámenes</TabsTrigger>
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
                  <Boxes className="w-5 h-5 text-primary" /> Nueva Etiqueta
                </CardTitle>
                <CardDescription>
                  Las etiquetas (ej: "Mercado Libre", "Walmart", "Amazon") son globales y se comparten entre módulos. Elige un módulo y agrégale la etiqueta que necesite; si la etiqueta ya existe se reutiliza automáticamente (no se duplica).
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
                    <Label>Módulo</Label>
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
                    <Label htmlFor="subcat-nombre">Nombre de Etiqueta</Label>
                    <Input
                      id="subcat-nombre"
                      placeholder="Ej: Mercado Libre"
                      value={subcatData.nombre}
                      onChange={e => setSubcatData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={loading || !subcatData.moduloId} className="w-full rounded-xl">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Etiqueta
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="examenes" className="mt-6 space-y-6">
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" /> Examen por Módulo
                </CardTitle>
                <CardDescription>Selecciona un módulo para crear o editar su examen de evaluación.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={selectedModuloId} onValueChange={setSelectedModuloId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {allModules.map(mod => (
                        <SelectItem key={mod.id} value={mod.id.toString()}>
                          {mod.categoria?.nombre ? `${mod.categoria.nombre} > ${mod.nombre}` : mod.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {loadingExamen ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : selectedModuloId && (
              <>
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">{examen ? "Datos del Examen" : "Crear Examen"}</CardTitle>
                    <CardDescription>
                      {examen ? "Modifica el título o la descripción del examen." : "Este módulo todavía no tiene examen."}
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSaveExamen}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="exam-titulo">Título del Examen</Label>
                        <Input
                          id="exam-titulo"
                          placeholder="Ej: Evaluación de Control de Gastos"
                          value={examData.titulo}
                          onChange={e => setExamData(prev => ({ ...prev, titulo: e.target.value }))}
                          required
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exam-desc">Descripción (Opcional)</Label>
                        <Input
                          id="exam-desc"
                          placeholder="Breve detalle..."
                          value={examData.descripcion}
                          onChange={e => setExamData(prev => ({ ...prev, descripcion: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button disabled={savingExamen} className="w-full rounded-xl">
                        {savingExamen ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {examen ? "Guardar Cambios" : "Crear Examen"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

                {examen && (
                  <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Preguntas</CardTitle>
                      <CardDescription>Preguntas de opción múltiple para este examen.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingPreguntas ? (
                        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" /></div>
                      ) : preguntas.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground text-sm">Todavía no hay preguntas.</p>
                      ) : (
                        <div className="space-y-3">
                          {preguntas.map((p, idx) => (
                            <div key={p.id} className="p-4 border rounded-2xl bg-background/50 group">
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold">{idx + 1}. {p.pregunta}</p>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 text-destructive opacity-0 group-hover:opacity-100"
                                  onClick={() => handleDeletePregunta(p.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="mt-2 space-y-1">
                                {(p.opciones as { texto: string; es_correcta: boolean }[]).map((op, i) => (
                                  <div key={i} className={cn(
                                    "flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg",
                                    op.es_correcta ? "bg-green-600/10 text-green-700 font-medium" : "text-muted-foreground"
                                  )}>
                                    {op.es_correcta ? <CircleCheck className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                                    {op.texto}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <Separator />

                      <form onSubmit={handleAddPregunta} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nueva-pregunta">Nueva Pregunta</Label>
                          <Input
                            id="nueva-pregunta"
                            placeholder="Escribe la pregunta..."
                            value={newPregunta}
                            onChange={e => setNewPregunta(e.target.value)}
                            className="rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Opciones (marca cuál es la correcta)</Label>
                          {newOpciones.map((op, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className={cn("h-9 w-9 shrink-0", op.es_correcta ? "text-green-600" : "text-muted-foreground")}
                                onClick={() => handleSetCorrectOption(index)}
                                title="Marcar como correcta"
                              >
                                <CircleCheck className="h-5 w-5" />
                              </Button>
                              <Input
                                placeholder={`Opción ${index + 1}`}
                                value={op.texto}
                                onChange={e => handleNewOptionChange(index, e.target.value)}
                                className="rounded-xl"
                              />
                              {newOpciones.length > 2 && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveOption(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={handleAddOption}>
                            <Plus className="h-3.5 w-3.5" /> Agregar Opción
                          </Button>
                        </div>

                        <Button disabled={savingPregunta} className="w-full rounded-xl">
                          {savingPregunta ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                          Agregar Pregunta
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
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