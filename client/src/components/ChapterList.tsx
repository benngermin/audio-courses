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
  
  // Debug log removed - no longer needed

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
    if (seconds === null || seconds === undefined) return "Unknown duration";
    // Ensure we're working with whole seconds by flooring first
    const totalSeconds = Math.floor(Math.abs(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60; // This is already an integer since totalSeconds is floored
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    if (!progress?.currentTime || !chapter.duration) return null;
    const currentTime = Math.floor(progress.currentTime);
    const duration = Math.floor(chapter.duration);
    const remaining = Math.max(0, duration - currentTime);
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
                {(() => {
                  // Completed chapters
                  if (progress?.isCompleted) {
                    return (
                      <>
                        <span className="whitespace-nowrap">{formatDuration(Math.floor(chapter.duration || 0))}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-green-600">Completed</span>
                      </>
                    );
                  }
                  // Playing/Paused chapters with progress
                  if (progress && progress.currentTime && progress.currentTime > 0) {
                    const currentTimeInt = Math.floor(progress.currentTime);
                    const durationInt = Math.floor(chapter.duration || 0);
                    const remainingTime = Math.max(0, durationInt - currentTimeInt);
                    return (
                      <>
                        <span className="whitespace-nowrap">{formatDuration(currentTimeInt)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">{formatDuration(remainingTime)} remaining</span>
                      </>
                    );
                  }
                  // Unplayed chapters - show only duration
                  if (chapter.duration) {
                    return <span className="whitespace-nowrap">{formatDuration(Math.floor(chapter.duration))}</span>;
                  }
                  // No duration info
                  return <span className="whitespace-nowrap">Unknown duration</span>;
                })()}
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
