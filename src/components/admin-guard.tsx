
"use client";

import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthorized(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "@hulk2012") {
      setIsAuthorized(true);
      sessionStorage.setItem("admin_auth", "true");
      setError(false);
    } else {
      setError(true);
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl bg-card/50 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
          <CardDescription>
            Ingresa la contraseña maestra para realizar cambios en el sistema.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Contraseña" 
                  className={`pl-10 rounded-xl ${error ? 'border-destructive' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Contraseña incorrecta
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full rounded-xl">
              Desbloquear Panel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
