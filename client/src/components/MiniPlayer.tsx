import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
    clearCurrentTrack 
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

  const {
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
  } = useAudio({
    src: currentChapter?.audioUrl || "",
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
  });

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
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div 
          className="px-4 py-3 cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          {/* Progress bar at the top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Left side - Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 bg-primary rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentChapter.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}