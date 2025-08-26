import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { useCurrentTrack, usePlaybackState } from "@/contexts/OptimizedAudioContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, ChevronRight, CheckCircle, CheckCircle2, Trash2, Loader2, ListMusic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Course, Assignment, Chapter, UserProgress, DownloadedContent } from "@shared/schema";

export default function Assignments() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { setCurrentTrack, currentChapter } = useCurrentTrack();
  const { isReadAlongVisible } = usePlaybackState();
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | undefined>(undefined);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const currentCourse = courses.length > 0 ? courses[0] : undefined; // For now, use first course

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
    if (currentAssignment && chapter) {
      setCurrentTrack(chapter, currentAssignment);
      // Audio will auto-play in OptimizedMiniPlayer when chapter changes
    }
  };

  const isLoading = coursesLoading || assignmentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {!isReadAlongVisible && (
          <AppHeader 
            currentCourse={currentCourse} 
            currentAssignment={currentAssignment}
            onAssignmentChange={handleAssignmentChange}
          />
        )}
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Loading...</p>
          </div>
        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {!isReadAlongVisible && (
        <AppHeader 
          currentCourse={currentCourse} 
          currentAssignment={currentAssignment}
          onAssignmentChange={handleAssignmentChange}
        />
      )}
      
      <main className="max-w-screen-xl mx-auto px-3 sm:px-4">
        {currentAssignment ? (
          <div className="py-4 sm:py-6">
            <AssignmentHeader 
              assignment={currentAssignment} 
              onChapterSelect={handleChapterSelect}
            />
            <ChapterListContent
              assignment={currentAssignment}
              onChapterSelect={handleChapterSelect}
            />
          </div>
        ) : (
          <div className="py-4 sm:py-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">No Assignment Selected</h2>
            <p className="text-sm sm:text-base text-slate-600">Please select an assignment from the dropdown in the header.</p>
          </div>
        )}
      </main>


    </div>
  );
}

// New component for assignment header with download all functionality
function AssignmentHeader({ 
  assignment, 
  onChapterSelect 
}: { 
  assignment: Assignment;
  onChapterSelect: (chapter: Chapter) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentChapter } = useCurrentTrack();
  
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignment.id, "chapters"],
  });
  
  const { data: downloads = [] } = useQuery<DownloadedContent[]>({
    queryKey: ["/api/downloads"],
  });
  
  const downloadedChapterIds = downloads.map(d => d.chapterId);
  const allChaptersDownloaded = chapters.length > 0 && chapters.every(ch => downloadedChapterIds.includes(ch.id));
  const someChaptersDownloaded = chapters.some(ch => downloadedChapterIds.includes(ch.id));
  
  const [downloadingChapters, setDownloadingChapters] = useState<string[]>([]);
  const [completedDownloads, setCompletedDownloads] = useState<number>(0);
  
  const chaptersToDownload = chapters.filter(ch => !downloadedChapterIds.includes(ch.id));
  const totalToDownload = downloadingChapters.length || chaptersToDownload.length;
  const downloadProgress = totalToDownload > 0 ? (completedDownloads / totalToDownload) * 100 : 0;
  
  const downloadAllMutation = useMutation({
    mutationFn: async () => {
      const toDownload = chapters.filter(ch => !downloadedChapterIds.includes(ch.id));
      if (toDownload.length === 0) {
        toast({
          title: "Already downloaded",
          description: "All chapters are already downloaded",
        });
        return [];
      }
      
      setDownloadingChapters(toDownload.map(ch => ch.id));
      setCompletedDownloads(0);
      
      const results = [];
      for (const chapter of toDownload) {
        try {
          const result = await apiRequest("POST", `/api/download/${chapter.id}`);
          results.push(result);
          setCompletedDownloads(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
        } catch (error) {
          console.error(`Failed to download chapter ${chapter.id}:`, error);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.length;
      if (successCount === chaptersToDownload.length) {
        toast({
          title: "Download complete",
          description: `All ${successCount} chapters have been downloaded`,
        });
      } else {
        toast({
          title: "Partial download",
          description: `Downloaded ${successCount} of ${chaptersToDownload.length} chapters`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
      setDownloadingChapters([]);
      setCompletedDownloads(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
      setDownloadingChapters([]);
      setCompletedDownloads(0);
    },
  });
  
  const isDownloading = downloadAllMutation.isPending || downloadingChapters.length > 0;
  

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h2 className="text-lg sm:text-2xl font-bold text-slate-800 line-clamp-2">
          {assignment.title}
        </h2>
        <div className="flex items-center gap-2">
          {!allChaptersDownloaded && (
            <button
              onClick={() => downloadAllMutation.mutate()}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-[#f5a07c] rounded-lg bg-[#fef6f3] hover:bg-[#fee8e0] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-800"
              title="Download All Chapters"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#ed7738]" />
                  <span className="hidden sm:inline">Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 text-[#ed7738]" />
                  <span className="hidden sm:inline">Download All</span>
                </>
              )}
            </button>
          )}
          {allChaptersDownloaded && (
            <button
              disabled
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-green-400 rounded-lg bg-green-50 font-medium text-green-700 cursor-default"
              title="All Chapters Downloaded"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="hidden sm:inline">All Downloaded</span>
            </button>
          )}
        </div>
      </div>
      
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
  
  const { data: downloads = [] } = useQuery<DownloadedContent[]>({
    queryKey: ["/api/downloads"],
  });
  
  const isDownloaded = downloads.some(d => d.chapterId === chapter.id);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/downloads/${chapter.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Download removed",
        description: "Chapter has been removed from offline storage",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove download",
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



  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={onPlay}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              progress?.isCompleted 
                ? "bg-green-100" 
                : "bg-[#ed7738]/10"
            }`}>
              {progress?.isCompleted ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <Play className="text-[#ed7738]" size={20} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">
                {chapter.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{formatDuration(chapter.duration)}</span>
                {isDownloaded && (
                  <>
                    <span>•</span>
                    <span className="text-[#003370] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Offline
                    </span>
                  </>
                )}
                {progress?.currentTime && progress.currentTime > 0 && !progress.isCompleted && (
                  <>
                    <span>•</span>
                    <span>
                      {(() => {
                        const remaining = Math.floor((chapter.duration || 0) - progress.currentTime);
                        return remaining > 0 ? `${formatDuration(remaining)} remaining` : '';
                      })()}
                    </span>
                  </>
                )}
                {progress?.isCompleted && !isDownloaded && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">Completed</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDownloaded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="p-2 text-slate-400 hover:text-red-600"
                title="Remove download"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
