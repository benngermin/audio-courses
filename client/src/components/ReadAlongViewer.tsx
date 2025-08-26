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
  PlayCircle
} from 'lucide-react';
import { useReadAlong } from '@/hooks/useReadAlong';
import { cn } from '@/lib/utils';

interface ReadAlongViewerProps {
  chapterId: string;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  className?: string;
}

export function ReadAlongViewer({ 
  chapterId, 
  currentTime, 
  isPlaying, 
  onSeek,
  className 
}: ReadAlongViewerProps) {
  const [showControls, setShowControls] = useState(false);
  
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
    <div className={cn("h-full flex flex-col read-along-fullscreen", className)}>
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
                  <span key={index} className="text-slate-700">
                    {item.content}
                  </span>
                );
              }

              const isActive = isSegmentActive(item.segmentIndex);
              const isParagraph = 'segmentType' in item && item.segmentType === 'paragraph';

              return (
                <span
                  key={index}
                  data-segment-index={item.segmentIndex}
                  onClick={() => handleSegmentClick(item.segmentIndex)}
                  className={cn(
                    "transition-all duration-200 cursor-pointer rounded px-1 py-0.5",
                    "hover:bg-orange-50 dark:hover:bg-orange-950/20",
                    isActive && [
                      "bg-orange-600 dark:bg-orange-500",
                      "text-white dark:text-white",
                      "font-medium shadow-sm"
                    ],
                    !isActive && "text-gray-700 dark:text-gray-300",
                    isParagraph && "block mb-4 p-2"
                  )}
                  title={`Click to jump to ${('startTime' in item ? (item.startTime as number) : 0).toFixed(1)}s`}
                >
                  {/* Removed play icon for cleaner look */}
                  {item.content}
                </span>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}