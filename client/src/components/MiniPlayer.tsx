import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LinearProgress } from "@/components/ui/circular-progress";
import { Play, Pause, ChevronUp, X, ListMusic } from "lucide-react";
import { useAudioContext } from "@/contexts/AudioContext";
import { useAudio } from "@/hooks/useAudio";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter } from "@shared/schema";

export function MiniPlayer() {
  const { 
    currentChapter, 
    currentAssignment, 
    isExpanded, 
    setIsExpanded,
    clearCurrentTrack,
    setAudioControls,
    setAudioState,
    setIsPlaying,
    isPlayAllMode,
    setCurrentTrack,
    setIsPlayAllMode,
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

  // Get all chapters for the current assignment to enable Play All
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", currentAssignment?.id, "chapters"],
    enabled: !!currentAssignment?.id && isPlayAllMode,
  });

  const handleEnded = useCallback(() => {
    if (!currentChapter || !currentAssignment) return;
    
    // If in Play All mode, advance to the next chapter
    if (isPlayAllMode && chapters.length > 0) {
      const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
      if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
        // There's a next chapter, play it
        const nextChapter = chapters[currentIndex + 1];
        console.log('Play All: Advancing to next chapter:', nextChapter.title);
        setCurrentTrack(nextChapter, currentAssignment);
      } else {
        // No more chapters, end Play All mode
        console.log('Play All: Finished all chapters');
        setIsPlayAllMode(false);
      }
    }
  }, [currentChapter, currentAssignment, isPlayAllMode, chapters, setCurrentTrack, setIsPlayAllMode]);

  // Log when we're about to use the audio (reduced logging)
  // console.log("MiniPlayer - Setting up audio with:", {
  //   chapterId: currentChapter?.id,
  //   audioUrl: currentChapter?.audioUrl,
  //   hasChapter: !!currentChapter,
  // });
  
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
  
  // Update isPlaying state in context
  useEffect(() => {
    setIsPlaying(isPlaying);
  }, [isPlaying, setIsPlaying]);

  // Auto-play when a new chapter is selected (only when chapter changes)
  const prevChapterIdRef = useRef<string | null>(null);
  const isAutoPlayingRef = useRef(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (currentChapter?.id && currentChapter.id !== prevChapterIdRef.current) {
      prevChapterIdRef.current = currentChapter.id;
      
      // Clear any pending auto-play
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
      
      // Prevent concurrent auto-play attempts
      if (isAutoPlayingRef.current) return;
      
      isAutoPlayingRef.current = true;
      
      // Give the audio element time to load
      autoPlayTimeoutRef.current = setTimeout(() => {
        console.log('Auto-playing chapter:', currentChapter.id);
        play()
          .then(() => {
            console.log('Auto-play successful');
          })
          .catch((error) => {
            console.error('Auto-play failed:', error);
          })
          .finally(() => {
            isAutoPlayingRef.current = false;
            autoPlayTimeoutRef.current = null;
          });
      }, 500); // Give more time for audio to load
      
      return () => {
        if (autoPlayTimeoutRef.current) {
          clearTimeout(autoPlayTimeoutRef.current);
          autoPlayTimeoutRef.current = null;
        }
        isAutoPlayingRef.current = false;
      };
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
    setIsPlayAllMode(false); // Clear Play All mode when closing
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
          className="px-5 sm:px-6 py-3 sm:py-5 cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center justify-between">
            {/* Left side - Track info */}
            <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-medium text-foreground truncate">
                    {currentChapter.title}
                  </p>
                  {isPlayAllMode && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full flex-shrink-0">
                      <ListMusic className="w-5 h-5 text-primary" />
                      <span className="text-xs font-medium text-primary">Play All</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {currentAssignment.title}
                </p>
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 sm:h-16 sm:w-16"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 sm:h-8 sm:w-8" />
                ) : (
                  <Play className="h-6 w-6 sm:h-8 sm:w-8 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={handleClose}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Time display with progress bar */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground tabular-nums min-w-[48px]">
              {formatTime(currentTime)}
            </span>
            <LinearProgress 
              value={currentTime}
              max={duration || 100}
              height={3}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground tabular-nums min-w-[48px] text-right">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}