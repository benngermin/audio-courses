import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, ChevronRight, ArrowLeft, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Assignment, Chapter, UserProgress } from "@shared/schema";

interface ChapterListProps {
  assignment: Assignment;
  onBack: () => void;
  onChapterSelect: (chapter: Chapter) => void;
  currentlyPlaying?: string;
}

export function ChapterList({ assignment, onBack, onChapterSelect, currentlyPlaying }: ChapterListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: chapters = [], isLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignment.id, "chapters"],
  });
  
  // Debug log to check chapter data structure
  console.log("Chapters data:", chapters);

  const downloadMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      return await apiRequest("POST", `/api/download/${chapterId}`);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Chapter is being downloaded for offline listening",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading...</h2>
        </div>
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
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {assignment.title}
        </h2>
        <p className="text-slate-600">Choose a chapter to begin listening</p>
      </div>
      
      <div className="space-y-3">
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            isCurrentlyPlaying={currentlyPlaying === chapter.id}
            onPlay={() => onChapterSelect(chapter)}
            onDownload={() => downloadMutation.mutate(chapter.id)}
            isDownloading={downloadMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface ChapterCardProps {
  chapter: Chapter;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}

function ChapterCard({ chapter, isCurrentlyPlaying, onPlay, onDownload, isDownloading }: ChapterCardProps) {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress", chapter.id],
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown duration";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    if (!progress?.currentTime || !chapter.duration) return null;
    const remaining = chapter.duration - progress.currentTime;
    return remaining > 0 ? formatDuration(remaining) : null;
  };

  const remainingTime = getRemainingTime();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onPlay}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isCurrentlyPlaying 
                ? "bg-amber-100" 
                : progress?.isCompleted 
                  ? "bg-green-100" 
                  : "bg-primary/10"
            }`}>
              {isCurrentlyPlaying ? (
                <Pause className="text-amber-600 h-4 w-4 sm:h-5 sm:w-5" />
              ) : progress?.isCompleted ? (
                <CheckCircle className="text-green-600 h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Play className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-slate-800 line-clamp-2">
                {chapter.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-500">
                <span className="whitespace-nowrap">{formatDuration(chapter.duration)}</span>
                {remainingTime && !progress?.isCompleted && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="whitespace-nowrap">{remainingTime} remaining</span>
                  </>
                )}
                {progress?.isCompleted && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-green-600">Completed</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              disabled={isDownloading}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <ChevronRight className="text-slate-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
