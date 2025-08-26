import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, RotateCw, Grid3X3 } from "lucide-react";
import { useCurrentTrack, usePlaybackState, useAudioControls, useAudioState } from "@/contexts/OptimizedAudioContext";
import { useOptimizedAudio } from "@/hooks/useOptimizedAudio";
import { useProgressTracker } from "@/hooks/useProgressTracker";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OptimizedMiniPlayer() {
  const { currentChapter, currentAssignment, setCurrentTrack } = useCurrentTrack();
  const { isExpanded, setIsExpanded, setIsPlaying, isReadAlongVisible, setIsReadAlongVisible } = usePlaybackState();
  const { setAudioControls } = useAudioControls();
  const { setAudioState } = useAudioState();

  // Get chapters for preloading
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", currentAssignment?.id, "chapters"],
    enabled: !!currentAssignment?.id,
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
  }, [currentChapter, currentAssignment, updateProgress]);

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

  // Track if this is the first interaction with a chapter
  const isFirstPlayRef = useRef(true);
  const prevChapterIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const currentId = currentChapter?.id;
    
    // When chapter changes, try to auto-play
    if (currentId && currentId !== prevChapterIdRef.current && play) {
      prevChapterIdRef.current = currentId;
      
      // Only auto-play after user has interacted with play button at least once
      // This ensures we comply with browser autoplay policies
      if (!isFirstPlayRef.current) {
        play().catch((error) => {
          console.log('Chapter change auto-play blocked, user needs to click play');
        });
      }
    }
  }, [currentChapter?.id, play]);
  
  // Track when user first clicks play
  const handlePlayClick = useCallback(() => {
    isFirstPlayRef.current = false;
    togglePlay();
  }, [togglePlay]);

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

  const handleSpeedChange = useCallback((speed: number) => {
    changePlaybackRate(speed);
  }, [changePlaybackRate]);

  const getSpeedLabel = useCallback((rate: number) => {
    if (rate === 1) return '1x';
    return `${rate}x`;
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
          height: '72px',
          background: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          paddingBottom: `env(safe-area-inset-bottom)` 
        }}
      >
        {/* Desktop Layout - Hidden on mobile */}
        <div className="hidden sm:flex items-center h-full px-4" style={{ gap: '16px' }}>
          {/* Time Display - Left */}
          <span 
            className="text-sm tabular-nums"
            style={{ 
              color: '#374151',
              minWidth: '40px',
              fontSize: '13px'
            }}
          >
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar */}
          <div 
            className="flex-1 relative cursor-pointer py-2"
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
              className="w-full relative"
              style={{
                height: '4px',
                background: '#E5E7EB',
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
              
              {/* Progress handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-100"
                style={{ 
                  left: duration ? `${(currentTime / duration) * 100}%` : '0%', 
                  marginLeft: '-6px',
                  border: '2px solid #FF6B35'
                }}
              />
            </div>
          </div>

          {/* Time Display - Right */}
          <span 
            className="text-sm tabular-nums"
            style={{ 
              color: '#374151',
              minWidth: '40px',
              fontSize: '13px',
              textAlign: 'right'
            }}
          >
            {formatTime(duration)}
          </span>

          {/* Speed Control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-8 px-2 hover:bg-gray-100 font-medium"
                style={{ 
                  minWidth: '40px',
                  color: '#374151',
                  fontSize: '13px'
                }}
              >
                {getSpeedLabel(playbackRate)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top">
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                <DropdownMenuItem
                  key={speed}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeedChange(speed);
                  }}
                  className="cursor-pointer"
                >
                  <span className={playbackRate === speed ? 'font-semibold' : ''}>
                    {getSpeedLabel(speed)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-300" />

          {/* Playback Controls */}
          <div className="flex items-center" style={{ gap: '4px' }}>
            {/* Skip Backward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                skipBackward(15);
              }}
              className="hover:bg-gray-100 h-8 w-8"
            >
              <RotateCcw className="h-4 w-4" style={{ color: '#374151' }} />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayClick();
              }}
              className="hover:bg-gray-100 h-9 w-9"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" style={{ color: '#374151' }} />
              ) : (
                <Play className="h-5 w-5" style={{ color: '#374151', marginLeft: '2px' }} />
              )}
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                skipForward(30);
              }}
              className="hover:bg-gray-100 h-8 w-8"
            >
              <RotateCw className="h-4 w-4" style={{ color: '#374151' }} />
            </Button>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-300" />

          {/* Read Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsReadAlongVisible(true);
            }}
            className="h-9 px-3 hover:bg-orange-600"
            style={{ 
              background: '#FF6B35',
              color: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <Grid3X3 className="h-4 w-4" />
            <span>Read</span>
          </Button>
        </div>

        {/* Mobile Layout - Visible only on mobile */}
        <div className="flex sm:hidden flex-col h-full px-4 py-2 justify-center">
          {/* Top Row - Progress and Time */}
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '8px' }}>
            {/* Current Time */}
            <span 
              className="text-sm font-medium"
              style={{ 
                color: '#1F2937',
                fontSize: '14px',
                minWidth: '45px'
              }}
            >
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <div 
              className="flex-1 relative py-1"
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
                className="w-full relative"
                style={{
                  height: '3px',
                  background: '#E5E7EB',
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
                
                {/* Progress handle - smaller on mobile */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md transition-all duration-100"
                  style={{ 
                    left: duration ? `${(currentTime / duration) * 100}%` : '0%', 
                    marginLeft: '-5px',
                    border: '2px solid #FF6B35'
                  }}
                />
              </div>
            </div>

            {/* Total Duration */}
            <span 
              className="text-sm font-medium"
              style={{ 
                color: '#1F2937',
                fontSize: '14px',
                minWidth: '45px',
                textAlign: 'right'
              }}
            >
              {formatTime(duration)}
            </span>
          </div>

          {/* Bottom Row - Controls */}
          <div className="flex items-center justify-between">
            {/* Speed Control */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="h-10 px-2 hover:bg-gray-100 font-medium"
                  style={{ 
                    minWidth: '36px',
                    color: '#1F2937',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {getSpeedLabel(playbackRate)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeedChange(speed);
                    }}
                    className="cursor-pointer"
                  >
                    <span className={playbackRate === speed ? 'font-semibold' : ''}>
                      {getSpeedLabel(speed)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Playback Controls */}
            <div className="flex items-center" style={{ gap: '8px' }}>
              {/* Skip Backward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  skipBackward(15);
                }}
                className="hover:bg-gray-100 h-10 w-10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12L5 12M5 12L12 5M5 12L12 19" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>

              {/* Play/Pause - Larger and Orange on Mobile */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayClick();
                }}
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ 
                  background: '#FF6B35',
                  color: 'white'
                }}
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="4" y="3" width="4" height="14" fill="white" />
                    <rect x="12" y="3" width="4" height="14" fill="white" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 3L16 10L6 17V3Z" fill="white" />
                  </svg>
                )}
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  skipForward(30);
                }}
                className="hover:bg-gray-100 h-10 w-10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12L19 12M19 12L12 5M19 12L12 19" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </div>

            {/* Read Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsReadAlongVisible(true);
              }}
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ 
                background: '#FF6B35',
                color: 'white'
              }}
            >
              <Grid3X3 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}