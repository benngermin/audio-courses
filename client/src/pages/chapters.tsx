import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { ChapterList } from "@/components/ChapterList";
import { useCurrentTrack, usePlaybackState } from "@/contexts/OptimizedAudioContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Assignment, Chapter } from "@shared/schema";

export default function Chapters() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { setCurrentTrack, currentChapter } = useCurrentTrack();
  const { isReadAlongVisible } = usePlaybackState();
  
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
    if (assignment) {
      setCurrentTrack(chapter, assignment);
    }
  };

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        {!isReadAlongVisible && <AppHeader />}
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Assignment not found.</p>
          </div>
        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {!isReadAlongVisible && <AppHeader />}
      
      <main className="max-w-screen-xl mx-auto px-4">
        <ChapterList
          assignment={assignment}
          onBack={handleBack}
          onChapterSelect={handleChapterSelect}
          currentlyPlaying={currentChapter?.id}
        />
      </main>
    </div>
  );
}
