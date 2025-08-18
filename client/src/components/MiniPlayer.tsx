import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LinearProgress } from "@/components/ui/circular-progress";
import { Play, Pause, ChevronUp, X, ListMusic, RotateCcw, RotateCw } from "lucide-react";
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
  
  const lastProgressUpdateRef = useRef(0);

  const progressMutation = useMutation({
    mutationFn: async (data: { chapterId: string; currentTime: number; isCompleted: boolean }) => {
      return await apiRequest("POST", "/api/progress", data);
    },
  });

  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (!currentChapter) return;
    // Update progress every 10 seconds
    if (currentTime - lastProgressUpdateRef.current >= 10) {
      progressMutation.mutate({
        chapterId: currentChapter.id,
        currentTime,
        isCompleted: false,
      });
      lastProgressUpdateRef.current = currentTime;
    }
  }, [currentChapter?.id, progressMutation]);

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
  const hasAutoPlayedRef = useRef(false);
  
  useEffect(() => {
    if (currentChapter?.id && currentChapter.id !== prevChapterIdRef.current) {
      prevChapterIdRef.current = currentChapter.id;
      hasAutoPlayedRef.current = false;
      // Reset progress update tracking for new chapter
      lastProgressUpdateRef.current = 0;
    }
  }, [currentChapter?.id]);
  
  useEffect(() => {
    // Auto-play immediately when a new chapter is selected, don't wait for duration
    if (currentChapter?.id && !hasAutoPlayedRef.current && !isPlaying && play) {
      hasAutoPlayedRef.current = true;
      console.log('Auto-playing chapter:', currentChapter.id);
      // Add small delay to ensure audio element is ready
      // iOS needs a bit more time to prepare the audio element
      const autoPlayTimer = setTimeout(() => {
        play()
          .then(() => {
            console.log('Auto-play successful');
          })
          .catch((error) => {
            console.error('Auto-play failed:', error);
            // On iOS, auto-play might fail initially but work on user interaction
            // Set flag to false to allow manual play attempt
            hasAutoPlayedRef.current = false; 
          });
      }, 200); // Increased delay for iOS compatibility
      
      return () => clearTimeout(autoPlayTimer);
    }
  }, [currentChapter?.id, isPlaying, play]);

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
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ 
          height: '80px',
          background: '#FFFFFF',
          borderTop: '1px solid #E0E0E0',
          padding: '12px',
          paddingBottom: `calc(12px + env(safe-area-inset-bottom))` 
        }}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center" style={{ gap: '12px', height: '100%' }}>
          {/* Visualizer */}
          <div 
            className="flex-shrink-0 bg-[#2c2d3e] flex items-center justify-center overflow-hidden"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '8px'
            }}
          >
            <div className={`visualizer ${isPlaying ? 'playing' : 'paused'} w-full h-full flex items-center justify-center relative scale-[0.3]`}>
              <div className="center-orb relative w-[120px] h-[120px] flex items-center justify-center">
                <div className="orb-inner absolute w-[60px] h-[60px] rounded-full"></div>
                <div className="orb-pulse absolute w-[100px] h-[100px] rounded-full"></div>
                <div className="orb-glow absolute w-[120px] h-[120px] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="flex-1 flex flex-col justify-center" style={{ gap: '10px', minWidth: 0 }}>
            {/* Top Row - Title and Controls */}
            <div className="flex items-center" style={{ gap: '12px' }}>
              {/* Title */}
              <p 
                className="flex-1 line-clamp-2"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1A1A1A',
                  lineHeight: 1.3
                }}
              >
                {currentChapter.title}
              </p>

              {/* Controls Group */}
              <div className="flex items-center flex-shrink-0" style={{ gap: '2px' }}>
                {/* Rewind Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipBackward(15);
                  }}
                  className="hover:bg-black/5"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'transparent',
                    borderRadius: '50%'
                  }}
                >
                  <RotateCcw className="h-5 w-5" style={{ color: '#1A1A1A' }} />
                </Button>

                {/* Play/Pause Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="hover:bg-black/5"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'transparent',
                    borderRadius: '50%'
                  }}
                >
                  {isPlaying ? (
                    <svg 
                      width="18" 
                      height="18" 
                      viewBox="0 0 18 18" 
                      fill="none"
                      style={{ color: '#1A1A1A' }}
                    >
                      <rect x="2" y="0" width="4" height="18" fill="currentColor" />
                      <rect x="12" y="0" width="4" height="18" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg 
                      width="14" 
                      height="18" 
                      viewBox="0 0 14 18" 
                      fill="none"
                      style={{ marginLeft: '2px', color: '#1A1A1A' }}
                    >
                      <path d="M0 0L14 9L0 18V0Z" fill="currentColor" />
                    </svg>
                  )}
                </Button>

                {/* Fast Forward Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipForward(30);
                  }}
                  className="hover:bg-black/5"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'transparent',
                    borderRadius: '50%'
                  }}
                >
                  <RotateCw className="h-5 w-5" style={{ color: '#1A1A1A' }} />
                </Button>
              </div>
            </div>

            {/* Progress Container */}
            <div className="flex items-center" style={{ gap: '8px' }}>
              {/* Current Time */}
              <span 
                style={{
                  fontSize: '11px',
                  color: '#999999',
                  minWidth: '28px',
                  fontFamily: 'monospace'
                }}
              >
                {formatTime(currentTime)}
              </span>

              {/* Progress Bar - Increased clickable area */}
              <div 
                className="flex-1 relative cursor-pointer"
                style={{
                  height: '20px', // Increased from 3px to 20px for larger click target
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!duration || !seek) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const newTime = percentage * duration;
                  seek(newTime);
                }}
              >
                {/* Actual visible progress bar */}
                <div 
                  className="w-full relative pointer-events-none"
                  style={{
                    height: '3px',
                    background: '#E0E0E0',
                    borderRadius: '2px'
                  }}
                >
                  {/* Progress fill */}
                  <div
                    className="absolute top-0 left-0 h-full transition-all duration-100"
                    style={{ 
                      background: '#FF6B35',
                      borderRadius: '2px',
                      width: duration ? `${(currentTime / duration) * 100}%` : '0%' 
                    }}
                  />
                  
                  {/* White circle handle */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-100 pointer-events-none"
                    style={{ 
                      left: duration ? `${(currentTime / duration) * 100}%` : '0%', 
                      marginLeft: '-6px',
                      border: '1px solid #FF6B35'
                    }}
                  />
                </div>
              </div>

              {/* Duration */}
              <span 
                style={{
                  fontSize: '11px',
                  color: '#999999',
                  minWidth: '28px',
                  fontFamily: 'monospace',
                  textAlign: 'right'
                }}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}