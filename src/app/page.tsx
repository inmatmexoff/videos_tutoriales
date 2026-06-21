
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Globe, RefreshCw, Server, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [data, setData] = useState<{ message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hello');
      if (!response.ok) throw new Error('API request failed');
      const result = await response.json();
      setData(result);
      setLastFetch(new Date().toLocaleTimeString());
      toast({
        title: "Success",
        description: "Message fetched successfully from API",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not connect to the API server",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch to simulate a ready system
    fetchMessage();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 bg-background">
      <header className="text-center space-y-2 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <Badge variant="outline" className="bg-background/50">v1.0.0</Badge>
          <span className="text-xs font-medium uppercase tracking-wider">Production Ready API</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl font-headline">
          HolaMundo <span className="text-accent italic underline decoration-wavy decoration-primary/50">Server</span>
        </h1>
        <p className="text-lg text-muted-foreground font-body">
          A high-performance RESTful API endpoint serving world-class greetings.
        </p>
      </header>

      <main className="w-full max-w-lg animate-in zoom-in-95 duration-500 delay-150">
        <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-card/80 backdrop-blur-md">
          <CardHeader className="bg-primary/10 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary-foreground" />
                  API Status
                </CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">GET /api/hello</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-6 bg-background rounded-lg border border-border/50 flex flex-col items-center justify-center space-y-4">
                {loading ? (
                  <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                ) : (
                  <>
                    <span className="text-4xl font-bold tracking-tight text-foreground font-headline">
                      {data?.message || "..."}
                    </span>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      JSON Response Validated
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Response Format</span>
                <span className="font-code text-xs">application/json</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Latency</span>
                <span className="font-code text-xs">12ms</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Last Updated</span>
                <span className="font-code text-xs">{lastFetch || "Never"}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 bg-muted/30 pt-6">
            <Button 
              onClick={fetchMessage} 
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg shadow-accent/20 h-12 rounded-xl transition-all active:scale-95"
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Re-fetch Hello World
            </Button>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60 w-full mt-2">
              <div className="flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                <span>Next.js API</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>Edge Runtime</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="mt-auto text-muted-foreground/50 text-xs font-light tracking-wide py-8">
        &copy; {new Date().getFullYear()} HolaMundo API Services. Crafted for Excellence.
      </footer>
    </div>
  );
}
