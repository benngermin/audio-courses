import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AssignmentList } from "@/components/AssignmentList";
import { ChapterList } from "@/components/ChapterList";
import { AudioPlayer } from "@/components/AudioPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";

import { useAudio } from "@/hooks/useAudio";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import type { Course, Assignment, Chapter } from "@shared/schema";
import { useLocation } from "wouter";

type View = "assignments" | "chapters" | "player" | "downloads" | "profile" | "admin";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const [currentView, setCurrentView] = useState<View>("assignments");
  const [currentCourse, setCurrentCourse] = useState<Course | undefined>();
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | undefined>();
  const [currentChapter, setCurrentChapter] = useState<Chapter | undefined>();
  const [audioContext, setAudioContext] = useState<{
    assignment: Assignment;
    chapter: Chapter;
    chapters: Chapter[];
  } | null>(null);

  // Get course ID from URL parameters or default to first course
  const urlParams = new URLSearchParams(window.location.search);
  const courseIdFromUrl = urlParams.get('courseId');

  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", currentCourse?.id, "assignments"],
    enabled: !!currentCourse?.id,
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", currentAssignment?.id, "chapters"],
    enabled: !!currentAssignment?.id,
  });

  // Auto-select course based on URL parameter or first available
  useEffect(() => {
    if (courses.length > 0 && !currentCourse) {
      const courseToSelect = courseIdFromUrl 
        ? courses.find(c => c.id === courseIdFromUrl) 
        : courses[0];
      if (courseToSelect) {
        setCurrentCourse(courseToSelect);
      }
    }
  }, [courses, currentCourse, courseIdFromUrl]);

  // Auto-select first assignment if available
  useEffect(() => {
    if (assignments.length > 0 && !currentAssignment) {
      setCurrentAssignment(assignments[0]);
    }
  }, [assignments, currentAssignment]);

  // Handle unauthorized errors
  useEffect(() => {
    if (coursesError && isUnauthorizedError(coursesError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [coursesError, toast]);

  // Audio player integration
  const audioPlayer = useAudio({
    src: audioContext?.chapter.audioUrl || "",
    onEnded: handleAudioEnded,
  });

  function handleAudioEnded() {
    if (audioContext) {
      const currentIndex = audioContext.chapters.findIndex(ch => ch.id === audioContext.chapter.id);
      if (currentIndex < audioContext.chapters.length - 1) {
        const nextChapter = audioContext.chapters[currentIndex + 1];
        setAudioContext({
          ...audioContext,
          chapter: nextChapter,
        });
      }
    }
  }

  const handleAssignmentSelect = (assignment: Assignment) => {
    setCurrentAssignment(assignment);
    setCurrentView("chapters");
  };

  const handleChapterSelect = (chapter: Chapter) => {
    if (!currentAssignment) return;
    
    setCurrentChapter(chapter);
    setAudioContext({
      assignment: currentAssignment,
      chapter,
      chapters,
    });
    setCurrentView("player");
  };

  const handleNavigation = (path: string) => {
    const viewMap: { [key: string]: View } = {
      "/assignments": "assignments",
      "/downloads": "downloads",
      "/profile": "profile",
      "/admin": "admin",
    };
    
    const view = viewMap[path] || "assignments";
    setCurrentView(view);
    navigate(path);
  };

  const handleAssignmentChange = (assignment: Assignment) => {
    setCurrentAssignment(assignment);
    if (currentView === "chapters" || currentView === "player") {
      setCurrentView("chapters");
    }
  };

  const getCurrentChapterIndex = () => {
    if (!audioContext) return -1;
    return audioContext.chapters.findIndex(ch => ch.id === audioContext.chapter.id);
  };

  const handlePreviousChapter = () => {
    if (!audioContext) return;
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex > 0) {
      const prevChapter = audioContext.chapters[currentIndex - 1];
      setAudioContext({
        ...audioContext,
        chapter: prevChapter,
      });
    }
  };

  const handleNextChapter = () => {
    if (!audioContext) return;
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < audioContext.chapters.length - 1) {
      const nextChapter = audioContext.chapters[currentIndex + 1];
      setAudioContext({
        ...audioContext,
        chapter: nextChapter,
      });
    }
  };

  const currentIndex = getCurrentChapterIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < (audioContext?.chapters.length || 0) - 1;

  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Loading courses...</p>
          </div>
        </main>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">No Courses Available</h2>
            <p className="text-slate-600">Contact your administrator to access course content.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader 
        currentCourse={currentCourse}
        currentAssignment={currentAssignment}
        onAssignmentChange={handleAssignmentChange}
      />
      
      <main className="max-w-screen-xl mx-auto px-4">
        {currentView === "assignments" && currentCourse && (
          <AssignmentList 
            courseId={currentCourse.id}
            onAssignmentSelect={handleAssignmentSelect}
          />
        )}
        
        {currentView === "chapters" && currentAssignment && (
          <ChapterList
            assignment={currentAssignment}
            onBack={() => setCurrentView("assignments")}
            onChapterSelect={handleChapterSelect}
            currentlyPlaying={audioContext?.chapter.id}
          />
        )}
        
        {currentView === "player" && audioContext && (
          <AudioPlayer
            assignment={audioContext.assignment}
            chapter={audioContext.chapter}
            onBack={() => setCurrentView("chapters")}
            onPrevious={handlePreviousChapter}
            onNext={handleNextChapter}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        )}

        {currentView === "downloads" && (
          <div className="py-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Downloaded Content</h2>
            <p className="text-slate-600">Your offline audio files will appear here.</p>
          </div>
        )}

        {currentView === "profile" && (
          <div className="py-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile</h2>
            <p className="text-slate-600">Manage your account settings and preferences.</p>
          </div>
        )}

        {currentView === "admin" && user?.isAdmin && (
          <div className="py-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Panel</h2>
            <p className="text-slate-600">Manage courses and sync content.</p>
          </div>
        )}
      </main>

      {/* Mini Player */}
      {audioContext && currentView !== "player" && (
        <MiniPlayer
          assignment={audioContext.assignment}
          chapter={audioContext.chapter}
          isPlaying={audioPlayer.isPlaying}
          onTogglePlay={audioPlayer.togglePlay}
          onExpand={() => setCurrentView("player")}
        />
      )}


    </div>
  );
}
