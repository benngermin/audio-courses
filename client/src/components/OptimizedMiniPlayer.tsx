import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, RotateCw, Grid3X3 } from "lucide-react";
import { useCurrentTrack, usePlaybackState, useAudioControls, useAudioState } from "@/contexts/OptimizedAudioContext";
import { useSimpleAudio } from "@/hooks/useSimpleAudio";
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
  const { currentChapter, currentAssignment, shouldAutoPlay, setCurrentTrack, clearAutoPlay } = useCurrentTrack();
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

  // Use simple audio hook - creates audio element on first user interaction
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
  } = useSimpleAudio({
    src: currentChapter?.audioUrl || "",
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

  // Track previous chapter to detect changes
  const prevChapterIdRef = useRef<string | null>(null);
  
  // Effect to handle auto-play when chapter changes from user interaction
  useEffect(() => {
    const currentId = currentChapter?.id;
    
    // When chapter changes and we should auto-play (from user click)
    if (currentId && currentId !== prevChapterIdRef.current) {
      prevChapterIdRef.current = currentId;
      
      if (shouldAutoPlay && play) {
        // Clear the flag immediately to prevent multiple attempts
        clearAutoPlay();
        
        // Play immediately - the audio element will be created on this user interaction
        play().then((success) => {
          if (success) {
            console.log('Audio started playing from chapter selection');
          } else {
            console.log('Audio play was blocked - user needs to click play button');
          }
        }).catch((error) => {
          console.log('Failed to auto-play after chapter selection:', error);
        });
      }
    }
  }, [currentChapter?.id, shouldAutoPlay, play, clearAutoPlay]);
  
  // Regular play button handler
  const handlePlayClick = useCallback(() => {
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
        className="fixed left-0 right-0 z-[60]"
        style={{ 
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 40px)`,
          height: '72px',
          background: '#FFFFFF',
          boxShadow: 'none',
          border: 'none',
          borderBottom: 'none'
        }}
      >
        {/* Desktop Layout - Hidden on mobile */}
        <div className="hidden sm:flex items-center h-full px-4" style={{ gap: '16px' }}>
          {/* Time Display and Progress Container */}
          <div className="flex-1 flex flex-col justify-center" style={{ gap: '4px' }}>
            {/* Progress Bar */}
            <div 
              className="relative cursor-pointer py-2"
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
            
            {/* Time Display and Chapter Title Row */}
            <div className="flex items-center justify-between">
              <span 
                className="text-xs tabular-nums"
                style={{ 
                  color: '#6B7280',
                  minWidth: '40px',
                  fontSize: '11px'
                }}
              >
                {formatTime(currentTime)}
              </span>
              
              {/* Chapter Title - Scrollable */}
              <div 
                className="flex-1 mx-3 overflow-hidden"
                style={{
                  maxWidth: 'calc(100% - 120px)'
                }}
              >
                <div 
                  className="text-sm whitespace-nowrap tabular-nums"
                  style={{
                    color: '#374151',
                    fontSize: '13px',
                    animation: currentChapter.title.length > 50 ? 'scroll-text 15s linear infinite' : 'none',
                    paddingRight: currentChapter.title.length > 50 ? '60px' : '0',
                    display: 'inline-block'
                  }}
                >
                  {currentChapter.title}
                  {currentChapter.title.length > 50 && (
                    <span style={{ paddingLeft: '60px' }}>{currentChapter.title}</span>
                  )}
                </div>
              </div>
              
              <span 
                className="text-xs tabular-nums"
                style={{ 
                  color: '#6B7280',
                  minWidth: '40px',
                  fontSize: '11px',
                  textAlign: 'right'
                }}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Speed Control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-8 hover:bg-gray-100 font-medium"
                style={{ 
                  width: '52px',
                  color: '#374151',
                  fontSize: '13px',
                  padding: '0 8px'
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

          {/* Read Button - Toggle */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsReadAlongVisible(!isReadAlongVisible);
            }}
            className="h-9 px-3 hover:bg-orange-600"
            style={{ 
              background: isReadAlongVisible ? '#374151' : '#FF6B35',
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
        <div className="flex sm:hidden flex-col h-full relative">
          {/* Progress Bar - Edge to Edge at Top */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!duration || !seek) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = x / rect.width;
              const newTime = percentage * duration;
              seek(newTime);
            }}
            style={{
              background: '#E5E7EB'
            }}
          >
            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 h-full transition-all duration-100"
              style={{ 
                background: '#FF6B35',
                width: duration ? `${(currentTime / duration) * 100}%` : '0%' 
              }}
            />
            
            {/* Progress handle - hidden on mobile for cleaner look */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md transition-all duration-100 opacity-0"
              style={{ 
                left: duration ? `${(currentTime / duration) * 100}%` : '0%', 
                marginLeft: '-4px',
                border: '1.5px solid #FF6B35'
              }}
            />
          </div>

          {/* Content Container */}
          <div className="flex flex-col justify-center flex-1 px-4 pt-3">
            {/* Time Display Row with Chapter Title */}
            <div className="flex justify-between items-center mb-2">
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: '#6B7280',
                  fontSize: '11px'
                }}
              >
                {formatTime(currentTime)}
              </span>
              
              {/* Chapter Title - Scrollable on Mobile */}
              <div 
                className="flex-1 mx-2 overflow-hidden"
                style={{
                  maxWidth: 'calc(100% - 80px)'
                }}
              >
                <div 
                  className="text-sm whitespace-nowrap font-medium"
                  style={{
                    color: '#1F2937',
                    fontSize: '13px',
                    animation: currentChapter.title.length > 30 ? 'scroll-text 12s linear infinite' : 'none',
                    paddingRight: currentChapter.title.length > 30 ? '40px' : '0',
                    display: 'inline-block'
                  }}
                >
                  {currentChapter.title}
                  {currentChapter.title.length > 30 && (
                    <span style={{ paddingLeft: '40px' }}>{currentChapter.title}</span>
                  )}
                </div>
              </div>
              
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: '#6B7280',
                  fontSize: '11px'
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
                  className="h-10 hover:bg-gray-100 font-medium"
                  style={{ 
                    width: '48px',
                    color: '#1F2937',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '0 8px'
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

            {/* Read Button - Toggle */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsReadAlongVisible(!isReadAlongVisible);
              }}
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ 
                background: isReadAlongVisible ? '#374151' : '#FF6B35',
                color: 'white'
              }}
            >
              <Grid3X3 className="h-5 w-5" />
            </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}