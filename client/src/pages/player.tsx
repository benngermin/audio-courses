import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AudioPlayer } from "@/components/AudioPlayer";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Assignment, Chapter } from "@shared/schema";

export default function Player() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Get IDs from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const assignmentId = urlParams.get('assignment');
  const chapterId = urlParams.get('chapter');

  const { data: assignment } = useQuery<Assignment>({
    queryKey: ["/api/assignments", assignmentId],
    enabled: !!assignmentId,
  });

  const { data: chapter } = useQuery<Chapter>({
    queryKey: ["/api/chapters", chapterId],
    enabled: !!chapterId,
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignmentId, "chapters"],
    enabled: !!assignmentId,
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleBack = () => {
    navigate(`/chapters?assignment=${assignmentId}`);
  };

  const getCurrentChapterIndex = () => {
    if (!chapter) return -1;
    return chapters.findIndex(ch => ch.id === chapter.id);
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex > 0) {
      const prevChapter = chapters[currentIndex - 1];
      navigate(`/player?assignment=${assignmentId}&chapter=${prevChapter.id}`);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      navigate(`/player?assignment=${assignmentId}&chapter=${nextChapter.id}`);
    }
  };

  const currentIndex = getCurrentChapterIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < chapters.length - 1;

  if (!assignment || !chapter) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Content not found.</p>
          </div>
        </main>
        <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin || false} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader />
      
      <main className="max-w-screen-xl mx-auto px-4">
        <AudioPlayer
          assignment={assignment}
          chapter={chapter}
          onBack={handleBack}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
      </main>

      <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin || false} />
    </div>
  );
}
