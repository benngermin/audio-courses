import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { ChapterList } from "@/components/ChapterList";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Assignment, Chapter } from "@shared/schema";

export default function Chapters() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Get assignment ID from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const assignmentId = urlParams.get('assignment');

  const { data: assignment } = useQuery<Assignment>({
    queryKey: ["/api/assignments", assignmentId],
    enabled: !!assignmentId,
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleBack = () => {
    navigate("/assignments");
  };

  const handleChapterSelect = (chapter: Chapter) => {
    navigate(`/player?assignment=${assignmentId}&chapter=${chapter.id}`);
  };

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Assignment not found.</p>
          </div>
        </main>
        <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader />
      
      <main className="max-w-screen-xl mx-auto px-4">
        <ChapterList
          assignment={assignment}
          onBack={handleBack}
          onChapterSelect={handleChapterSelect}
        />
      </main>

      <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin} />
    </div>
  );
}
