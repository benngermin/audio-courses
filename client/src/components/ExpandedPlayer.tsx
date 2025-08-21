import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CircularProgress, LinearProgress } from "@/components/ui/circular-progress";
import { 
  ChevronDown, 
  Play, 
  Pause, 
  Volume2,
  VolumeX,
  Share,
  Download,
  Settings2,
  Cast,
  Gauge,
  RotateCcw,
  RotateCw,
  Volume1,
  ListMusic,
  Music
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
    setCurrentTrack,
    isPlayAllMode,
    setIsPlayAllMode 
  } = useAudioContext();
  
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

  // Removed chapter navigation as per new design

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
          {/* Header with responsive padding */}
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 pt-1 pb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20"
            >
              <ChevronDown className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
            </Button>
            
            <div className="text-center flex-1">
              <p className="text-xs text-gray-600 font-semibold">NOW PLAYING</p>
            </div>

            {/* Empty div to maintain spacing balance */}
            <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20"></div>
          </div>

          {/* Main content area with compressed mobile spacing */}
          <div className="flex-1 flex flex-col px-4 sm:px-7 md:px-10 pt-4 sm:pt-6 pb-4 sm:pb-10 md:pb-12 overflow-y-auto">
            {/* Audio Visualizer - 16px from header */}
            <div className="w-full mb-6 sm:mb-4 relative flex justify-center">
              <div className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-full md:aspect-square bg-[#2c2d3e] rounded-[20px] flex items-center justify-center overflow-hidden">
                <div className={`visualizer ${isPlaying ? 'playing' : 'paused'} w-full h-full flex items-center justify-center relative`}>
                  <div className="center-orb relative w-[100px] sm:w-[110px] md:w-[120px] h-[100px] sm:h-[110px] md:h-[120px] flex items-center justify-center">
                    <div className="orb-inner absolute w-[50px] sm:w-[55px] md:w-[60px] h-[50px] sm:h-[55px] md:h-[60px] rounded-full"></div>
                    <div className="orb-pulse absolute w-[80px] sm:w-[90px] md:w-[100px] h-[80px] sm:h-[90px] md:h-[100px] rounded-full"></div>
                    <div className="orb-glow absolute w-[100px] sm:w-[110px] md:w-[120px] h-[100px] sm:h-[110px] md:h-[120px] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Track info - 24px from visualizer */}
            <div className="text-center mb-6 sm:mb-6 md:mb-9 px-2 sm:px-4">
              <h1 className="text-[22px] sm:text-[20px] md:text-[22px] font-semibold text-[#333] mb-1.5 sm:mb-2 line-clamp-2 leading-[1.3]">
                {currentChapter.title}
              </h1>
              <p className="text-base sm:text-base font-normal text-[#999] line-clamp-1 leading-[1.4]">
                {currentAssignment.title}
              </p>
            </div>

            {/* Progress bar - 24px from track info */}
            <div className="mb-0">
              <div className="relative group">
                <div 
                  className="relative h-1 bg-[#d3d3d3] cursor-pointer"
                  onClick={(e) => {
                    if (!duration || !seek) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newTime = percentage * duration;
                    seek(newTime);
                  }}
                >
                  {/* Progress fill */}
                  <div
                    className="absolute top-0 left-0 h-full bg-[#ff6b35] transition-all duration-100"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                  
                  {/* Draggable handle */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-white rounded-full shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none"
                    style={{ left: duration ? `${(currentTime / duration) * 100}%` : '0%', marginLeft: '-8px' }}
                    onMouseDown={(e) => {
                      if (!duration || !seek) return;
                      e.preventDefault();
                      const startX = e.clientX;
                      const startTime = currentTime;
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        if (!rect || !duration || !seek) return;
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const newTime = Math.max(0, Math.min(duration, startTime + (deltaPercentage * duration)));
                        seek(newTime);
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      if (!duration || !seek) return;
                      e.preventDefault();
                      const touch = e.touches[0];
                      const startX = touch.clientX;
                      const startTime = currentTime;
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      
                      const handleTouchMove = (moveEvent: TouchEvent) => {
                        if (!rect || !duration || !seek) return;
                        const touch = moveEvent.touches[0];
                        const deltaX = touch.clientX - startX;
                        const deltaPercentage = deltaX / rect.width;
                        const newTime = Math.max(0, Math.min(duration, startTime + (deltaPercentage * duration)));
                        seek(newTime);
                      };
                      
                      const handleTouchEnd = () => {
                        document.removeEventListener('touchmove', handleTouchMove);
                        document.removeEventListener('touchend', handleTouchEnd);
                      };
                      
                      document.addEventListener('touchmove', handleTouchMove);
                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  />
                </div>
              </div>
              
              {/* Time display - 10px from progress bar */}
              <div className="flex justify-between mt-2.5 sm:mt-2">
                <span className="text-sm text-gray-500 tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <span className="text-sm text-gray-500 tabular-nums">
                  -{formatTime(duration - currentTime)}
                </span>
              </div>
            </div>

            {/* Main controls - 28px from time labels */}
            <div className="flex items-center justify-center gap-9 sm:gap-7 md:gap-9 mt-7 sm:mt-4 md:mt-5 mb-3.5 sm:mb-2 md:mb-2.5">
              {/* Rewind 15 seconds - Responsive circular design */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skipBackward(15)}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white border border-[#e0e0e0] hover:border-[#ff6b35] hover:bg-[#fff5f2] transition-all duration-200 hover:scale-105 active:scale-95 group ripple"
                >
                  <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 group-hover:text-[#ff6b35]" />
                </Button>
                {/* Floating label badge - hidden on mobile */}
                <span className="hidden sm:block absolute -top-2 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#ff6b35] text-white text-xs font-semibold rounded-full px-2 py-0.5 pointer-events-none">
                  15s
                </span>
              </div>

              {/* Play/Pause button - responsive sizing */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-[72px] w-[72px] sm:h-[72px] sm:w-[72px] md:h-[72px] md:w-[72px] bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white rounded-full shadow-lg hover:scale-105 transition-all hover:shadow-xl active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 fill-white" />
                ) : (
                  <Play className="h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 ml-1 fill-white" />
                )}
              </Button>

              {/* Forward 30 seconds - Responsive circular design */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skipForward(30)}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white border border-[#e0e0e0] hover:border-[#ff6b35] hover:bg-[#fff5f2] transition-all duration-200 hover:scale-105 active:scale-95 group ripple"
                >
                  <RotateCw className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 group-hover:text-[#ff6b35]" />
                </Button>
                {/* Floating label badge - hidden on mobile */}
                <span className="hidden sm:block absolute -top-2 -left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#ff6b35] text-white text-xs font-semibold rounded-full px-2 py-0.5 pointer-events-none">
                  30s
                </span>
              </div>
            </div>

            {/* Bottom controls - 28px from playback controls, 16px to bottom */}
            <div className="flex items-center w-full mt-3.5 sm:mt-2 md:mt-2.5 mb-4 sm:mb-0">
              {/* Left side - Queue/Playlist button */}
              <div className="flex-1 flex justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlayAllMode(!isPlayAllMode)}
                  className={`p-2 sm:p-3 min-h-[40px] sm:min-h-[48px] transition-all ${isPlayAllMode ? 'bg-primary/10 hover:bg-primary/20 px-3 sm:px-4' : 'hover:bg-gray-100'} flex items-center gap-1 sm:gap-2`}
                  title={isPlayAllMode ? "Play All Mode: On" : "Play All Mode: Off"}
                >
                  <ListMusic className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${isPlayAllMode ? 'text-[#ff6b35]' : 'text-[#666]'}`} />
                  {isPlayAllMode && (
                    <span className="text-sm sm:text-base font-medium text-[#ff6b35]">Play All</span>
                  )}
                </Button>
              </div>

              {/* Center - Cast button */}
              <div className="flex-1 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    toast({
                      title: "Cast",
                      description: "Casting feature coming soon",
                    });
                  }}
                  className="p-2 sm:p-3 hover:bg-gray-100 transition-colors"
                >
                  <Cast className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-[#666]" />
                </Button>
              </div>

              {/* Right side - Playback speed button */}
              <div className="flex-1 flex justify-end">
                <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] p-2 sm:p-3 hover:bg-gray-100 transition-colors text-[#ff6b35] font-semibold text-[16px] sm:text-[18px] md:text-[20px] flex items-center justify-center"
                  >
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  sideOffset={8}
                  className="min-w-[120px] z-[100] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-2"
                  style={{ zIndex: 100 }}
                >
                  {playbackSpeeds.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onSelect={() => {
                        console.log('Speed selected:', speed);
                        changePlaybackRate(speed);
                      }}
                      className="px-5 py-3.5 text-[17px] font-medium text-[#333] cursor-pointer hover:bg-[#f5f5f5] rounded-lg focus:bg-[#f5f5f5] focus:outline-none data-[highlighted]:bg-[#f5f5f5] leading-[1.2]"
                    >
                      <span className={`w-full text-center ${
                        speed === playbackRate ? "text-[#ff6b35] font-semibold" : ""
                      }`}>
                        {speed === 0.5 && "0.5x"}
                        {speed === 0.75 && "0.75x"}
                        {speed === 1 && "Normal"}
                        {speed === 1.25 && "1.25x"}
                        {speed === 1.5 && "1.5x"}
                        {speed === 2 && "2x"}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>


          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}