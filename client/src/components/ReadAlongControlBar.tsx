import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, RotateCw, Grid3X3, LayoutGrid } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ReadAlongControlBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onSpeedChange: (speed: number) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export function ReadAlongControlBar({
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  onTogglePlay,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onSpeedChange,
  onViewModeChange,
  viewMode = 'list',
  className
}: ReadAlongControlBarProps) {
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getSpeedLabel = useCallback((rate: number) => {
    if (rate === 1) return '1x';
    return `${rate}x`;
  }, []);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700",
        "px-4 py-3",
        className
      )}
      style={{ paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}
      data-testid="read-along-control-bar"
    >
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Left side - Time display */}
        <div className="flex items-center gap-2">
          <span 
            className="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300"
            data-testid="text-current-time"
          >
            {formatTime(currentTime)}
          </span>
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <span 
            className="text-sm tabular-nums text-gray-500 dark:text-gray-400"
            data-testid="text-duration"
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Center - Playback controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Speed control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 w-10 sm:h-11 sm:w-11 p-0 font-semibold text-sm",
                  "hover:text-orange-600 dark:hover:text-orange-500",
                  playbackRate !== 1 && "text-orange-600 dark:text-orange-500"
                )}
                data-testid="button-speed-control"
              >
                {getSpeedLabel(playbackRate)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[120px]">
              {speedOptions.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => onSpeedChange(speed)}
                  className={cn(
                    "cursor-pointer",
                    playbackRate === speed && "text-orange-600 dark:text-orange-500 font-semibold"
                  )}
                  data-testid={`button-speed-${speed}`}
                >
                  {getSpeedLabel(speed)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Skip backward button - 15s */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipBackward}
            className="h-10 w-10 sm:h-11 sm:w-11 p-0 hover:text-orange-600 dark:hover:text-orange-500"
            title="Skip backward 15 seconds"
            data-testid="button-skip-backward"
          >
            <div className="relative">
              <RotateCcw className="h-5 w-5" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold">
                15
              </span>
            </div>
          </Button>

          {/* Play/Pause button - Large, Orange */}
          <Button
            onClick={onTogglePlay}
            size="lg"
            className={cn(
              "h-12 w-12 sm:h-14 sm:w-14 p-0 rounded-full",
              "bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600",
              "text-white shadow-lg hover:shadow-xl transition-all"
            )}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
            ) : (
              <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5" />
            )}
          </Button>

          {/* Skip forward button - 30s */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipForward}
            className="h-10 w-10 sm:h-11 sm:w-11 p-0 hover:text-orange-600 dark:hover:text-orange-500"
            title="Skip forward 30 seconds"
            data-testid="button-skip-forward"
          >
            <div className="relative">
              <RotateCw className="h-5 w-5" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold">
                30
              </span>
            </div>
          </Button>
        </div>

        {/* Right side - View mode toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange?.(viewMode === 'grid' ? 'list' : 'grid')}
          className={cn(
            "h-10 w-10 sm:h-11 sm:w-11 p-0",
            "hover:text-orange-600 dark:hover:text-orange-500",
            "transition-colors"
          )}
          title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          data-testid="button-view-mode"
        >
          {viewMode === 'grid' ? (
            <LayoutGrid className="h-5 w-5" />
          ) : (
            <Grid3X3 className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}