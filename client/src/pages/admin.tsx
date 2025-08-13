import { useEffect } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { AppHeader } from "@/components/AppHeader";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Admin() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      navigate("/assignments");
    }
  }, [user, isLoading, toast, navigate]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Loading...</p>
          </div>
        </main>

      </div>
    );
  }

  if (!user?.isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="max-w-screen-xl mx-auto px-4">
        <AdminPanel />
      </main>


    </div>
  );
}
