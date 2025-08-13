import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, ChevronRight, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Course, Assignment, Chapter, UserProgress } from "@shared/schema";

export default function Assignments() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | undefined>(undefined);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const currentCourse = courses[0]; // For now, use first course

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", currentCourse?.id, "assignments"],
    enabled: !!currentCourse?.id,
  });

  // Set first assignment as default when assignments load
  if (assignments.length > 0 && !currentAssignment) {
    setCurrentAssignment(assignments[0]);
  }

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleAssignmentChange = (assignment: Assignment) => {
    setCurrentAssignment(assignment);
  };

  const handleChapterSelect = (chapter: Chapter) => {
    navigate(`/player?assignment=${currentAssignment?.id}&chapter=${chapter.id}`);
  };

  const isLoading = coursesLoading || assignmentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader 
          currentCourse={currentCourse} 
          currentAssignment={currentAssignment}
          onAssignmentChange={handleAssignmentChange}
        />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Loading...</p>
          </div>
        </main>
        <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin || false} />
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
        {currentAssignment ? (
          <div className="py-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {currentAssignment.title}
              </h2>
              <p className="text-slate-600">Use the drop down in the header to select a different Assignment</p>
            </div>
            <ChapterListContent
              assignment={currentAssignment}
              onChapterSelect={handleChapterSelect}
            />
          </div>
        ) : (
          <div className="py-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Assignment Selected</h2>
            <p className="text-slate-600">Please select an assignment from the dropdown in the header.</p>
          </div>
        )}
      </main>

      <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin || false} />
    </div>
  );
}

// Component to display chapters without the back button and header
function ChapterListContent({ assignment, onChapterSelect }: { 
  assignment: Assignment; 
  onChapterSelect: (chapter: Chapter) => void;
}) {
  const { data: chapters = [], isLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignment.id, "chapters"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => (
        <ChapterCard
          key={chapter.id}
          chapter={chapter}
          onPlay={() => onChapterSelect(chapter)}
        />
      ))}
    </div>
  );
}

interface ChapterCardProps {
  chapter: Chapter;
  onPlay: () => void;
}

function ChapterCard({ chapter, onPlay }: ChapterCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress", chapter.id],
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/download/${chapter.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Chapter is being downloaded for offline listening",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown duration";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!progress?.currentTime || !chapter.duration) return 0;
    return (progress.currentTime / chapter.duration) * 100;
  };

  const getRemainingTime = () => {
    if (!progress?.currentTime || !chapter.duration) return null;
    const remaining = chapter.duration - progress.currentTime;
    return remaining > 0 ? formatDuration(remaining) : null;
  };

  const progressPercentage = getProgressPercentage();
  const remainingTime = getRemainingTime();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onPlay}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              progress?.isCompleted 
                ? "bg-green-100" 
                : "bg-primary/10"
            }`}>
              {progress?.isCompleted ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <Play className="text-primary" size={20} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">
                {chapter.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{formatDuration(chapter.duration)}</span>
                {progress?.currentTime && progress.currentTime > 0 && !progress.isCompleted && (
                  <>
                    <span>•</span>
                    <span>{remainingTime} remaining</span>
                  </>
                )}
                {progress?.isCompleted && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">Completed</span>
                  </>
                )}
              </div>
              {progressPercentage > 0 && !progress?.isCompleted && (
                <Progress value={progressPercentage} className="w-full h-1.5 mt-2" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                downloadMutation.mutate();
              }}
              disabled={downloadMutation.isPending}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <Download className="h-4 w-4" />
            </Button>
            <ChevronRight className="text-slate-400 h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
