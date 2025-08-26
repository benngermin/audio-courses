import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OptimizedAudioProvider } from "@/contexts/OptimizedAudioContext";
import { AudioPlayerUI } from "@/components/AudioPlayerUI";
import NotFound from "@/pages/not-found";
import Assignments from "@/pages/assignments";
import Chapters from "@/pages/chapters";
import Player from "@/pages/player";
import Admin from "@/pages/admin";
import AudioTest from "@/pages/audio-test";
import Login from "@/pages/login";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {isAuthenticated ? <Redirect to="/assignments" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/assignments">
        {isAuthenticated ? <Assignments /> : <Redirect to="/login" />}
      </Route>
      <Route path="/chapters">
        {isAuthenticated ? <Chapters /> : <Redirect to="/login" />}
      </Route>
      <Route path="/player">
        {isAuthenticated ? <Player /> : <Redirect to="/login" />}
      </Route>
      <Route path="/admin">
        {isAuthenticated ? <Admin /> : <Redirect to="/login" />}
      </Route>
      <Route path="/audio-test">
        {isAuthenticated ? <AudioTest /> : <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OptimizedAudioProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <AudioPlayerUI />
        </TooltipProvider>
      </OptimizedAudioProvider>
    </QueryClientProvider>
  );
}

export default App;
