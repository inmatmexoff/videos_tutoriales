"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Search, Plus, Layers, User, LogOut, LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabasePROD } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const CIRCLE = 56;
const RADIUS = CIRCLE / 2;
const HALO_GAP = 10;
const HALO = CIRCLE + HALO_GAP * 2;
const HALO_RADIUS = HALO / 2;
const CIRCLE_TOP = -(RADIUS + 6); // sobresale poco, para no estorbar el contenido de arriba
const HALO_TOP = CIRCLE_TOP + RADIUS - HALO_RADIUS;
const CIRCLE_BOTTOM = CIRCLE_TOP + CIRCLE; // dónde termina el círculo dentro de la barra
const ROW_TOP = CIRCLE_BOTTOM + 4; // la fila de íconos/labels arranca justo debajo del círculo
const AUTO_HIDE_MS = 5000;
const NAV_ICONS: LucideIcon[] = [Home, Search, Plus, Layers];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    supabasePROD.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null));
    const { data: { subscription } } = supabasePROD.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Oculta la barra a los 5s de estar visible; se reinicia al expandirla de nuevo
  // o al navegar (para no colapsarla a mitad de una interacción).
  useEffect(() => {
    if (collapsed) return;
    const timer = setTimeout(() => setCollapsed(true), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [collapsed, pathname, searchParams]);

  if (pathname === '/login' || !userEmail) return null;

  const searchOpen = pathname === '/' && searchParams.get('buscar') === '1';

  let activeIndex = -1;
  if (pathname === '/') activeIndex = searchOpen ? 1 : 0;
  else if (pathname === '/upload') activeIndex = 2;
  else if (pathname === '/admin') activeIndex = 3;

  const CollapsedIcon = activeIndex >= 0 ? NAV_ICONS[activeIndex] : Home;
  const collapsedTop = (64 - CIRCLE) / 2;
  const centerPercent = activeIndex >= 0 ? (activeIndex + 0.5) * 20 : null;

  const handleToggleSearch = () => {
    if (pathname !== '/') {
      router.push('/?buscar=1');
      return;
    }
    router.push(searchOpen ? '/' : '/?buscar=1');
  };

  const handleLogout = async () => {
    await supabasePROD.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 pointer-events-none">
      <div className="relative h-16">
        {/* Fondo de la barra: se contrae a un círculo al colapsar, con transición suave */}
        <div
          className={cn(
            "absolute transition-all duration-300 ease-in-out",
            collapsed
              ? "rounded-full bg-primary shadow-xl ring-2 ring-background/80"
              : "rounded-full bg-card/95 backdrop-blur-md border shadow-lg"
          )}
          style={collapsed
            ? { left: 0, top: collapsedTop, width: CIRCLE, height: CIRCLE }
            : { left: 0, top: 0, width: '100%', height: '100%' }}
        />

        {/* Botón que aparece colapsado: solo el ícono de la página activa */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Mostrar barra de navegación"
          className={cn(
            "absolute flex items-center justify-center rounded-full text-primary-foreground transition-opacity duration-200",
            collapsed ? "opacity-100 pointer-events-auto delay-150" : "opacity-0 pointer-events-none"
          )}
          style={{ left: 0, top: collapsedTop, width: CIRCLE, height: CIRCLE }}
        >
          <CollapsedIcon className="h-5 w-5" />
        </button>

        {centerPercent !== null && (
          <>
            {/* Halo concéntrico: crea la muesca cóncava que abraza el círculo */}
            <div
              className={cn(
                "absolute bg-background rounded-full pointer-events-none transition-[left] duration-300 ease-out transition-opacity",
                collapsed ? "opacity-0" : "opacity-100"
              )}
              style={{ left: `calc(${centerPercent}% - ${HALO_RADIUS}px)`, top: HALO_TOP, width: HALO, height: HALO }}
            />
            {/* Círculo flotante del item activo */}
            <div
              className={cn(
                "absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[left] duration-300 ease-out transition-opacity",
                collapsed ? "opacity-0" : "opacity-100"
              )}
              style={{ left: `calc(${centerPercent}% - ${RADIUS}px)`, top: CIRCLE_TOP, width: CIRCLE, height: CIRCLE }}
            >
              {activeIndex === 0 && <Home className="h-5 w-5" />}
              {activeIndex === 1 && <Search className="h-5 w-5" />}
              {activeIndex === 2 && <Plus className="h-5 w-5" />}
              {activeIndex === 3 && <Layers className="h-5 w-5" />}
            </div>
          </>
        )}

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-start justify-between px-1 transition-opacity duration-150",
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          )}
          style={{ top: ROW_TOP }}
        >
          <button type="button" onClick={() => router.push('/')} className="flex flex-col items-center flex-1">
            <span className={cn("h-5 w-5 flex items-center justify-center text-muted-foreground transition-opacity duration-200", activeIndex === 0 && "opacity-0")}>
              <Home className="h-4 w-4" />
            </span>
            <span className={cn("text-[9px] mt-0 transition-all duration-200", activeIndex === 0 ? "font-bold text-foreground scale-110" : "text-muted-foreground scale-100")}>Inicio</span>
          </button>

          <button type="button" onClick={handleToggleSearch} className="flex flex-col items-center flex-1">
            <span className={cn("h-5 w-5 flex items-center justify-center text-muted-foreground transition-opacity duration-200", activeIndex === 1 && "opacity-0")}>
              <Search className="h-4 w-4" />
            </span>
            <span className={cn("text-[9px] mt-0 transition-all duration-200", activeIndex === 1 ? "font-bold text-foreground scale-110" : "text-muted-foreground scale-100")}>Buscar</span>
          </button>

          <button type="button" onClick={() => router.push('/upload')} className="flex flex-col items-center flex-1">
            <span className={cn("h-5 w-5 flex items-center justify-center text-muted-foreground transition-opacity duration-200", activeIndex === 2 && "opacity-0")}>
              <Plus className="h-4 w-4" />
            </span>
            <span className={cn("text-[9px] mt-0 transition-all duration-200", activeIndex === 2 ? "font-bold text-foreground scale-110" : "text-muted-foreground scale-100")}>Nuevo</span>
          </button>

          <button type="button" onClick={() => router.push('/admin')} className="flex flex-col items-center flex-1">
            <span className={cn("h-5 w-5 flex items-center justify-center text-muted-foreground transition-opacity duration-200", activeIndex === 3 && "opacity-0")}>
              <Layers className="h-4 w-4" />
            </span>
            <span className={cn("text-[9px] mt-0 transition-all duration-200", activeIndex === 3 ? "font-bold text-foreground scale-110" : "text-muted-foreground scale-100")}>Estructura</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex flex-col items-center flex-1">
                <span className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
                <span className="text-[9px] mt-0 text-muted-foreground">Perfil</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="rounded-xl border-none shadow-xl w-56 mb-2">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-muted-foreground">Sesión iniciada como</p>
                <p className="text-sm font-medium truncate">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer rounded-lg">
                <Layers className="mr-2 h-4 w-4" /> Gestionar Estructura
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
