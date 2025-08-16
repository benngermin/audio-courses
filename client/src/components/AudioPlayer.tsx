import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  ChevronDown,
  Volume2,
  VolumeX,
  Download,
  Share,
  ChevronLeft,
  ChevronRight,
  Settings2,
  FastForward
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAudio } from "@/hooks/useAudio";
import { AudioVisualizer } from "@/components/ui/audio-visualizer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, Chapter } from "@shared/schema";

interface AudioPlayerProps {
  assignment: Assignment;
  chapter: Chapter;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer({ 
  assignment, 
  chapter, 
  onBack, 
  onPrevious, 
  onNext,
  hasPrevious,
  hasNext 
}: AudioPlayerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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
    // Update progress every 10 seconds to avoid too many API calls
    if (currentTime - lastProgressUpdate >= 10) {
      progressMutation.mutate({
        chapterId: chapter.id,
        currentTime,
        isCompleted: false,
      });
      setLastProgressUpdate(currentTime);
    }
  }, [chapter.id, lastProgressUpdate, progressMutation]);

  const handleEnded = useCallback(() => {
    // Mark chapter as completed
    progressMutation.mutate({
      chapterId: chapter.id,
      currentTime: chapter.duration || 0,
      isCompleted: true,
    });
    // Auto-advance to next chapter if enabled and available
    if (autoAdvance && hasNext && onNext) {
      onNext();
    }
  }, [chapter.id, chapter.duration, progressMutation, autoAdvance, hasNext, onNext]);

  const handleLoadedMetadata = useCallback((audioDuration: number) => {
    // Update chapter duration if not set
    if (!chapter.duration && audioDuration) {
      // Could call API to update chapter duration
    }
  }, [chapter.duration]);

  // Debug logging
  console.log("AudioPlayer - chapter data:", chapter);
  console.log("AudioPlayer - audioUrl:", chapter?.audioUrl);

  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isLoading,
    play,
    pause,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
    changePlaybackRate,
    changeVolume,
    toggleMute,
  } = useAudio({
    src: chapter.audioUrl || "",
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
    onLoadedMetadata: handleLoadedMetadata,
  });

  // Load saved progress on chapter change
  const { data: progress } = useQuery<{ currentTime: number; isCompleted: boolean }>({
    queryKey: ["/api/progress", chapter.id],
    enabled: !!chapter.id,
  });

  useEffect(() => {
    if (progress?.currentTime && progress.currentTime > 0) {
      seek(progress.currentTime);
    }
  }, [progress, seek]);

  // Update Media Session metadata
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapter.title,
        artist: assignment.title,
        album: "The Institutes Audio Learning",
        artwork: [
          {
            src: '/favicon.ico',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      });
    }
  }, [chapter.title, assignment.title]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    seek(newTime);
  };

  const handleShare = async () => {
    const shareData = {
      title: chapter.title,
      text: `Listen to "${chapter.title}" from ${assignment.title}`,
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

  return (
    <div className="py-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="flex items-center gap-2 text-primary font-medium mb-4 hover:text-primary-dark"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Chapters
      </Button>

      {/* Chapter Info */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {chapter.title}
        </h1>
        <p className="text-slate-600">
          {assignment.title}
        </p>
      </div>

      {/* Audio Visualization */}
      <div className="bg-card rounded-2xl p-8 shadow-lg border border-border mb-8">
        <AudioVisualizer isPlaying={isPlaying} className="mb-6" />

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
            disabled={isLoading}
          />
        </div>

        {/* Main Controls - 16px gap between buttons per style guide */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => skipBackward(15)}
            className="p-3 text-muted-foreground hover:text-foreground"
          >
            <SkipBack className="h-6 w-6" />
          </Button>
          
          <Button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-16 h-16 bg-primary hover:bg-primary-dark text-white rounded-full shadow-play-button hover:scale-105 transition-all"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => skipForward(15)}
            className="p-3 text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Playback Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <span>{playbackRate}x</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {playbackSpeeds.map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onSelect={() => changePlaybackRate(speed)}
                    className={speed === playbackRate ? "bg-primary/10" : ""}
                  >
                    {speed}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="p-2"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => changeVolume(value[0] / 100)}
                className="w-20"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadMutation.mutate(chapter.id)}
              disabled={downloadMutation.isPending}
              className="p-2"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {/* Share */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="p-2"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chapter Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Previous</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50"
        >
          <span className="text-sm">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Playback Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Playback Settings
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-6 px-2"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        {showSettings && (
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FastForward className="h-4 w-4 text-slate-600" />
                <Label htmlFor="playback-speed" className="text-sm">Playback Speed</Label>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <span>{playbackRate}x</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {playbackSpeeds.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onSelect={() => changePlaybackRate(speed)}
                      className={speed === playbackRate ? "bg-primary/10" : ""}
                    >
                      {speed}x {speed === 1 && "(Normal)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-advance" className="text-sm flex items-center gap-2">
                <SkipForward className="h-4 w-4 text-slate-600" />
                Auto-advance to next chapter
              </Label>
              <Switch
                id="auto-advance"
                checked={autoAdvance}
                onCheckedChange={setAutoAdvance}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
