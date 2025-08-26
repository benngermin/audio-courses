import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
// Card components removed for full-screen mode
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BookOpen, 
  Type, 
  Scroll, 
  Eye, 
  EyeOff, 
  Settings,
  AlertCircle,
  ChevronDown,
  PlayCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  List
} from 'lucide-react';
import { useReadAlong } from '@/hooks/useReadAlong';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ReadAlongViewerProps {
  chapterId: string;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause?: () => void;
  duration?: number;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  className?: string;
}

export function ReadAlongViewer({ 
  chapterId, 
  currentTime, 
  isPlaying, 
  onSeek,
  onPlayPause,
  duration = 0,
  playbackRate = 1,
  onPlaybackRateChange,
  className 
}: ReadAlongViewerProps) {
  const [showControls, setShowControls] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  const {
    readAlongData,
    isLoading,
    error,
    hasReadAlong,
    activeSegmentIndex,
    textSize,
    autoScroll,
    setTextSize,
    setAutoScroll,
    isSegmentActive,
    seekToSegment,
    getTextSizeClass,
    processTextForDisplay,
    textContainerRef,
  } = useReadAlong({
    chapterId,
    currentTime,
    isPlaying,
  });

  const handleSegmentClick = useCallback((segmentIndex: number) => {
    const time = seekToSegment(segmentIndex);
    if (time !== null) {
      onSeek(time);
    }
  }, [seekToSegment, onSeek]);

  const textSizes = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'Extra Large' }
  ] as const;

  if (isLoading) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state
  if (error && !hasReadAlong) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-muted-foreground mb-2">Failed to load read-along content</p>
          <p className="text-sm text-muted-foreground">
            {error.message || 'Please try again later'}
          </p>
        </div>
      </div>
    );
  }

  if (!hasReadAlong || !readAlongData) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="flex flex-col items-center text-center">
          <EyeOff className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Read-along text is not available for this chapter.
          </p>
        </div>
      </div>
    );
  }

  const processedText = processTextForDisplay(
    readAlongData.textContent, 
    readAlongData.segments
  );

  return (
    <div className={cn("h-full flex flex-col read-along-fullscreen relative", className)}>
      <div className="flex-1 overflow-hidden">
        <div 
          ref={textContainerRef}
          className={cn(
            "h-full overflow-y-auto prose prose-slate max-w-none read-along-content",
            getTextSizeClass(textSize)
          )}
        >
          <div className="space-y-4 pb-8">
            {processedText.map((item, index) => {
              if (item.type === 'text') {
                return (
                  <span key={index} style={{ color: '#333', opacity: 0.6 }}>
                    {item.content}
                  </span>
                );
              }

              const isActive = isSegmentActive(item.segmentIndex);
              const isParagraph = 'segmentType' in item && item.segmentType === 'paragraph';
              
              // Determine if segment is past, current, or future
              const segmentStartTime = 'startTime' in item ? (item.startTime as number) : 0;
              const segmentEndTime = 'endTime' in item ? (item.endTime as number) : 0;
              const isPast = currentTime > segmentEndTime;
              const isCurrent = currentTime >= segmentStartTime && currentTime <= segmentEndTime;
              const isFuture = currentTime < segmentStartTime;

              return (
                <span
                  key={index}
                  data-segment-index={item.segmentIndex}
                  onClick={() => handleSegmentClick(item.segmentIndex)}
                  className={cn(
                    "cursor-pointer rounded",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    isParagraph && "block mb-4",
                    isActive && "border-l-4"
                  )}
                  style={{
                    color: '#333',
                    opacity: isPast ? 0.4 : isFuture ? 0.6 : 1,
                    transition: 'opacity 0.3s ease, background-color 0.3s ease, padding 0.3s ease',
                    background: isActive ? 'linear-gradient(90deg, rgba(51,51,51,0.1) 0%, rgba(51,51,51,0.05) 100%)' : 'transparent',
                    borderLeftColor: isActive ? '#333' : 'transparent',
                    paddingLeft: isActive ? '12px' : '4px',
                    paddingRight: '4px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    fontWeight: isActive ? 500 : 400
                  }}
                  title={`Click to jump to ${segmentStartTime.toFixed(1)}s`}
                >
                  {/* Removed play icon for cleaner look */}
                  <span style={{ 
                    color: isActive ? '#333' : 'inherit',
                    fontWeight: isActive ? 600 : 'inherit'
                  }}>
                    {item.content}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Settings Button */}
      <motion.button
        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
        className="fixed bottom-32 right-6 z-50 w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-read-along-settings"
      >
        <Settings className="w-6 h-6 text-white" />
      </motion.button>

      {/* Settings Menu */}
      {showSettingsMenu && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-48 right-6 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80"
        >
          {/* Text Size Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">TEXT SIZE</h3>
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {textSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setTextSize(size.value as 'sm' | 'md' | 'lg' | 'xl')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                    textSize === size.value
                      ? "bg-orange-500 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                  data-testid={`button-text-size-${size.value}`}
                >
                  {size.value === 'sm' && 'S'}
                  {size.value === 'md' && 'M'}
                  {size.value === 'lg' && 'L'}
                  {size.value === 'xl' && 'XL'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Scroll Section */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-scroll" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              AUTO-SCROLL
            </Label>
            <Switch
              id="auto-scroll"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              className="data-[state=checked]:bg-orange-500"
              data-testid="switch-auto-scroll"
            />
          </div>
        </motion.div>
      )}

      {/* Click outside to close menu */}
      {showSettingsMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSettingsMenu(false)}
        />
      )}
    </div>
  );
}