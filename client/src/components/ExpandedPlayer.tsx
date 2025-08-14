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
  RotateCw
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

const playbackSpeeds = [1, 1.25, 1.5, 1.75, 2, 3];

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
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            
            <div className="text-center flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">NOW PLAYING</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                  <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
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

          {/* Main content area - Responsive scaling */}
          <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 pb-6 sm:pb-8 overflow-y-auto">
            {/* Album art placeholder - podcast style */}
            <div className="mx-auto mb-6 sm:mb-8 relative">
              <div className="w-56 h-56 sm:w-72 sm:h-72 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center shadow-inner">
                <div className="text-primary/30">
                  <svg className="w-24 h-24 sm:w-32 sm:h-32" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Track info - Responsive text sizes */}
            <div className="text-center mb-6 sm:mb-8 px-4">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 line-clamp-2">
                {currentChapter.title}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground line-clamp-1">
                {currentAssignment.title}
              </p>
            </div>

            {/* Time display with progress bar - matching podcast app style */}
            <div className="flex items-center gap-3 mb-8 px-2">
              <span className="text-sm text-muted-foreground tabular-nums min-w-[45px]">
                {formatTime(currentTime)}
              </span>
              <LinearProgress 
                value={currentTime}
                max={duration || 100}
                height={6}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground tabular-nums min-w-[55px] text-right">
                -{formatTime(duration - currentTime)}
              </span>
            </div>

            {/* Main playback controls - matching podcast app layout */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-10 sm:mb-12">
              {/* Rewind 15 seconds - 3X BIGGER */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skipBackward(15)}
                  className="h-[48px] w-[48px] sm:h-[60px] sm:w-[60px] rounded-full hover:bg-accent/10 transition-all border border-muted-foreground/20"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-foreground leading-none">-15</span>
                    <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5" />
                  </div>
                </Button>
              </div>

              {/* Play/Pause button - larger and centered */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-20 w-20 sm:h-24 sm:w-24 bg-primary hover:bg-white text-white hover:text-primary rounded-full shadow-lg hover:scale-105 transition-all hover:shadow-xl"
              >
                {isPlaying ? (
                  <Pause className="h-14 w-14 sm:h-16 sm:w-16 stroke-[3]" />
                ) : (
                  <Play className="h-14 w-14 sm:h-16 sm:w-16 ml-2 sm:ml-2.5 stroke-[3]" />
                )}
              </Button>

              {/* Forward 30 seconds - 3X BIGGER */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skipForward(30)}
                  className="h-[48px] w-[48px] sm:h-[60px] sm:w-[60px] rounded-full hover:bg-accent/10 transition-all border border-muted-foreground/20"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-foreground leading-none">+30</span>
                    <RotateCw className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5" />
                  </div>
                </Button>
              </div>
            </div>

            {/* Bottom row controls - centered like podcast app */}
            <div className="flex items-center justify-center gap-8 sm:gap-10">
              {/* Volume/Mute button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isMuted) {
                    toggleMute();
                  } else {
                    setShowVolume(!showVolume);
                  }
                }}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full hover:bg-accent/10"
              >
                {isMuted ? (
                  <VolumeX className="h-9 w-9 sm:h-10 sm:w-10 text-foreground stroke-[3]" />
                ) : (
                  <Volume2 className="h-9 w-9 sm:h-10 sm:w-10 text-foreground stroke-[3]" />
                )}
              </Button>

              {/* AirPlay/Cast button - works for both iOS and Android */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  toast({
                    title: "Cast",
                    description: "Casting feature coming soon",
                  });
                }}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full hover:bg-accent/10"
              >
                <Cast className="h-9 w-9 sm:h-10 sm:w-10 text-foreground stroke-[3]" />
              </Button>

              {/* Playback speed button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-full hover:bg-accent/10"
                  >
                    <div className="relative">
                      <Gauge className="h-9 w-9 sm:h-10 sm:w-10 text-foreground stroke-[3]" />
                      {playbackRate !== 1 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] sm:text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                          {playbackRate}x
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[140px]">
                  {playbackSpeeds.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => changePlaybackRate(speed)}
                      className={speed === playbackRate ? "bg-accent font-semibold" : ""}
                    >
                      <span className="w-full text-center text-base">{speed}x {speed === 1 && "(Normal)"}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Volume slider - appears when volume button is clicked */}
            {showVolume && (
              <div className="flex items-center gap-4 mt-6 px-8">
                <VolumeX className="h-5 w-5 text-muted-foreground" />
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={(value) => changeVolume(value[0] / 100)}
                  className="flex-1 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                />
                <Volume2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}