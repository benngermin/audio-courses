import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import { useCurrentTrack, usePlaybackState, useAudioControls, useAudioState } from "@/contexts/OptimizedAudioContext";
import { useOptimizedAudio } from "@/hooks/useOptimizedAudio";
import { useProgressTracker } from "@/hooks/useProgressTracker";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter } from "@shared/schema";

export function OptimizedMiniPlayer() {
  const { currentChapter, currentAssignment, setCurrentTrack } = useCurrentTrack();
  const { isExpanded, setIsExpanded, isPlayAllMode, setIsPlayAllMode, setIsPlaying } = usePlaybackState();
  const { setAudioControls } = useAudioControls();
  const { setAudioState } = useAudioState();

  // Get chapters for Play All mode and preloading
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", currentAssignment?.id, "chapters"],
    enabled: !!currentAssignment?.id && isPlayAllMode,
  });

  // Calculate next chapters for preloading
  const nextChapterUrls = useRef<string[]>([]);
  useEffect(() => {
    if (currentChapter && chapters.length > 0) {
      const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
      if (currentIndex !== -1) {
        // Preload next 2 chapters
        const nextChapters = chapters.slice(currentIndex + 1, currentIndex + 3);
        nextChapterUrls.current = nextChapters.map(ch => ch.audioUrl).filter(Boolean);
      }
    }
  }, [currentChapter, chapters]);

  // Progress tracking
  const { updateProgress } = useProgressTracker({
    chapterId: currentChapter?.id || '',
    onError: (error) => console.error('Progress tracking error:', error),
  });

  const handleTimeUpdate = useCallback((currentTime: number) => {
    updateProgress(currentTime);
  }, [updateProgress]);

  const handleEnded = useCallback(() => {
    if (!currentChapter || !currentAssignment) return;
    
    // Mark as completed
    updateProgress(currentChapter.duration || 0, true);
    
    // Play All mode logic
    if (isPlayAllMode && chapters.length > 0) {
      const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
      if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
        const nextChapter = chapters[currentIndex + 1];
        console.log('Play All: Advancing to next chapter:', nextChapter.title);
        setCurrentTrack(nextChapter, currentAssignment);
      } else {
        console.log('Play All: Finished all chapters');
        setIsPlayAllMode(false);
      }
    }
  }, [currentChapter, currentAssignment, isPlayAllMode, chapters, setCurrentTrack, setIsPlayAllMode, updateProgress]);

  // Use optimized audio hook with preloading
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
  } = useOptimizedAudio({
    src: currentChapter?.audioUrl || "",
    preloadNext: nextChapterUrls.current,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
  });

  // Share audio controls and state with context
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

  // Auto-play logic with race condition protection
  const prevChapterIdRef = useRef<string | null>(null);
  const hasAutoPlayedRef = useRef(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const currentId = currentChapter?.id;
    
    // Clear any existing timer first
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    
    // Reset auto-play flag when chapter changes
    if (currentId && currentId !== prevChapterIdRef.current) {
      prevChapterIdRef.current = currentId;
      hasAutoPlayedRef.current = false;
      
      // Only auto-play if not currently playing and we have a play function
      if (!isPlaying && play && !hasAutoPlayedRef.current) {
        hasAutoPlayedRef.current = true;
        
        autoPlayTimerRef.current = setTimeout(() => {
          // Double-check conditions before playing to prevent race conditions
          if (currentChapter?.id === currentId && !isPlaying) {
            play().catch((error) => {
              console.warn('Auto-play failed:', error);
              hasAutoPlayedRef.current = false;
            });
          }
        }, 200);
      }
    }
    
    // Cleanup timer on unmount or dependency change
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [currentChapter?.id, isPlaying, play]);

  // Media Session metadata
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

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

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

              {/* Progress Bar */}
              <div 
                className="flex-1 relative cursor-pointer"
                style={{
                  height: '20px',
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