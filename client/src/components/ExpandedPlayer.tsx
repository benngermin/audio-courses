import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CircularProgress, LinearProgress } from "@/components/ui/circular-progress";
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  Share,
  Download,
  Settings2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAudioContext } from "@/contexts/AudioContext";
import { useAudio } from "@/hooks/useAudio";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter } from "@shared/schema";

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function ExpandedPlayer() {
  const { toast } = useToast();
  const { 
    currentChapter, 
    currentAssignment, 
    isExpanded, 
    setIsExpanded,
    setCurrentTrack 
  } = useAudioContext();
  
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);
  const [showVolume, setShowVolume] = useState(false);

  // Get all chapters for navigation
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", currentAssignment?.id, "chapters"],
    enabled: !!currentAssignment?.id,
  });

  const progressMutation = useMutation({
    mutationFn: async (data: { chapterId: string; currentTime: number; isCompleted: boolean }) => {
      return await apiRequest("POST", "/api/progress", data);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      return await apiRequest("POST", `/api/download/${chapterId}`);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Chapter is being downloaded for offline listening",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (!currentChapter) return;
    if (currentTime - lastProgressUpdate >= 10) {
      progressMutation.mutate({
        chapterId: currentChapter.id,
        currentTime,
        isCompleted: false,
      });
      setLastProgressUpdate(currentTime);
    }
  }, [currentChapter, lastProgressUpdate, progressMutation]);

  // Use shared audio controls and state from MiniPlayer via context
  const { audioControls, audioState, isPlaying: contextIsPlaying } = useAudioContext();
  
  // Use audio state from context
  const isPlaying = contextIsPlaying;
  const currentTime = audioState.currentTime;
  const duration = audioState.duration || currentChapter?.duration || 0;
  const playbackRate = audioState.playbackRate;
  const volume = audioState.volume;
  const isMuted = audioState.isMuted;
  
  // Debug log to check if currentTime is updating (removed to reduce console noise)
  // useEffect(() => {
  //   console.log("ExpandedPlayer - currentTime:", currentTime, "duration:", duration, "progress:", (currentTime / duration) * 100);
  // }, [currentTime, duration]);
  

  
  // Use audio controls from context (provided by MiniPlayer)
  const togglePlay = audioControls?.togglePlay || (() => {});
  const seek = audioControls?.seek || (() => {});
  const skipForward = audioControls?.skipForward || (() => {});
  const skipBackward = audioControls?.skipBackward || (() => {});
  const changePlaybackRate = audioControls?.changePlaybackRate || (() => {});
  const changeVolume = audioControls?.changeVolume || (() => {});
  const toggleMute = audioControls?.toggleMute || (() => {});

  // Load saved progress
  const { data: progress } = useQuery<{ currentTime: number; isCompleted: boolean }>({
    queryKey: ["/api/progress", currentChapter?.id],
    enabled: !!currentChapter?.id,
  });

  useEffect(() => {
    if (progress?.currentTime && progress.currentTime > 0) {
      seek(progress.currentTime);
    }
  }, [progress, seek]);

  const getCurrentChapterIndex = () => {
    if (!currentChapter) return -1;
    return chapters.findIndex(ch => ch.id === currentChapter.id);
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex > 0) {
      const prevChapter = chapters[currentIndex - 1];
      // Update context with new chapter
      if (currentAssignment) {
        setCurrentTrack(prevChapter, currentAssignment);
      }
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      if (currentAssignment) {
        setCurrentTrack(nextChapter, currentAssignment);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleShare = async () => {
    const shareData = {
      title: currentChapter?.title,
      text: `Listen to "${currentChapter?.title}" from ${currentAssignment?.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Chapter link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const currentIndex = getCurrentChapterIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < chapters.length - 1;

  if (!currentChapter || !currentAssignment) return null;

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 bg-background z-[60] flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-10 w-10"
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
            
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-gray-600">NOW PLAYING</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadMutation.mutate(currentChapter.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download for offline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col justify-center px-8 pb-8">
            {/* Circular Progress with Play Button */}
            <div className="mx-auto mb-8 relative">
              <CircularProgress
                value={currentTime}
                max={duration || 100}
                size={280}
                strokeWidth={4}
                isPlaying={isPlaying}
                className="drop-shadow-xl"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="h-24 w-24 rounded-full bg-primary hover:bg-primary-dark text-white shadow-play-button hover:scale-105 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="h-12 w-12" />
                  ) : (
                    <Play className="h-12 w-12 ml-2" />
                  )}
                </Button>
              </CircularProgress>
            </div>

            {/* Track info */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {currentChapter.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {currentAssignment.title}
              </p>
            </div>

            {/* Time display with progress bar */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatTime(currentTime)}
              </span>
              <LinearProgress 
                value={currentTime}
                max={duration || 100}
                height={4}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatTime(duration)}
              </span>
            </div>

            {/* Playback controls - 16px gap between buttons per style guide */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {/* Previous chapter */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              {/* Previous track (15 seconds back) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipBackward(15)}
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Play/Pause button in the middle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-12 w-12 bg-primary hover:bg-primary/90 text-white rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>

              {/* Forward track (30 seconds forward) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipForward(30)}
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {/* Next chapter */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={!hasNext}
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Volume and speed controls */}
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-8 w-8"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                {showVolume && (
                  <Slider
                    value={[volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={(value) => changeVolume(value[0] / 100)}
                    className="w-24"
                  />
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {playbackSpeeds.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => changePlaybackRate(speed)}
                    >
                      {speed}x {speed === 1 && "(Normal)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}