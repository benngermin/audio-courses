import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LinearProgress } from "@/components/ui/circular-progress";
import { Play, Pause, ChevronUp, X } from "lucide-react";
import { useAudioContext } from "@/contexts/AudioContext";
import { useAudio } from "@/hooks/useAudio";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

export function MiniPlayer() {
  const { 
    currentChapter, 
    currentAssignment, 
    isExpanded, 
    setIsExpanded,
    clearCurrentTrack,
    setAudioControls,
    setAudioState,
  } = useAudioContext();
  
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);

  const progressMutation = useMutation({
    mutationFn: async (data: { chapterId: string; currentTime: number; isCompleted: boolean }) => {
      return await apiRequest("POST", "/api/progress", data);
    },
  });

  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (!currentChapter) return;
    // Update progress every 10 seconds
    if (currentTime - lastProgressUpdate >= 10) {
      progressMutation.mutate({
        chapterId: currentChapter.id,
        currentTime,
        isCompleted: false,
      });
      setLastProgressUpdate(currentTime);
    }
  }, [currentChapter, lastProgressUpdate, progressMutation]);

  const handleEnded = useCallback(() => {
    if (!currentChapter) return;
    // We'll handle completion in the audio hook
  }, [currentChapter]);

  // Log when we're about to use the audio
  console.log("MiniPlayer - Setting up audio with:", {
    chapterId: currentChapter?.id,
    audioUrl: currentChapter?.audioUrl,
    hasChapter: !!currentChapter,
  });
  
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isMuted,
    togglePlay,
    seek,
    play,
    pause,
    skipForward,
    skipBackward,
    changePlaybackRate,
    changeVolume,
    toggleMute,
  } = useAudio({
    src: currentChapter?.audioUrl || "",
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
  });

  // Share audio controls with context (for ExpandedPlayer to use)
  useEffect(() => {
    setAudioControls({
      play,
      pause,
      togglePlay,
      seek,
      skipForward,
      skipBackward,
      changePlaybackRate,
      changeVolume,
      toggleMute,
    });
  }, [play, pause, togglePlay, seek, skipForward, skipBackward, changePlaybackRate, changeVolume, toggleMute, setAudioControls]);

  // Share audio state with context - update frequently for smooth progress
  useEffect(() => {
    setAudioState({
      currentTime,
      duration,
      volume,
      playbackRate,
      isMuted,
    });
  }, [currentTime, duration, volume, playbackRate, isMuted, setAudioState]);

  // Auto-play when a new chapter is selected (only when chapter changes)
  const prevChapterIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentChapter?.id && currentChapter.id !== prevChapterIdRef.current) {
      prevChapterIdRef.current = currentChapter.id;
      console.log("Chapter changed, auto-playing:", currentChapter.title);
      // Small delay to ensure audio is loaded
      const timer = setTimeout(() => {
        console.log("Attempting to auto-play after delay");
        play();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentChapter?.id, play]);

  // Update Media Session metadata
  useEffect(() => {
    if (currentChapter && currentAssignment && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title,
        artist: currentAssignment.title,
        album: "The Institutes Audio Learning",
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    }
  }, [currentChapter, currentAssignment, togglePlay]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearCurrentTrack();
  };

  if (!currentChapter || !currentAssignment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div 
          className="px-4 py-3 cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          {/* Progress bar at the top */}
          <LinearProgress 
            value={currentTime}
            max={duration || 100}
            height={2}
            className="absolute top-0 left-0 right-0"
          />

          <div className="flex items-center justify-between">
            {/* Left side - Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 bg-primary rounded-full animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentChapter.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentAssignment.title}
                </p>
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Time display */}
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}