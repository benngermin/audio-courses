import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AudioPlayer } from "@/components/AudioPlayer";

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

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignmentId, "chapters"],
    enabled: !!assignmentId,
  });

  // Find the current chapter from the chapters array
  const chapter = chapters.find(ch => ch.id === chapterId);

  // Debug logging
  console.log("Player - chapterId:", chapterId);
  console.log("Player - chapters array:", chapters);
  console.log("Player - found chapter:", chapter);
  if (chapter) {
    console.log("Player - chapter details:", {
      id: chapter.id,
      title: chapter.title,
      audioUrl: chapter.audioUrl,
      hasAudioUrl: !!chapter.audioUrl
    });
  }

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

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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


    </div>
  );
}
