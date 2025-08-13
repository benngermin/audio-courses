import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Assignments from "@/pages/assignments";
import Chapters from "@/pages/chapters";
import Player from "@/pages/player";

import Admin from "@/pages/admin";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Auto-authenticate when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to SSO login automatically
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/chapters" component={Chapters} />
      <Route path="/player" component={Player} />

      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
