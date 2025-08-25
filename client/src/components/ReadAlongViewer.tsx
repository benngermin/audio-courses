import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Read Along
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !hasReadAlong) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Read Along
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground mb-2">Failed to load read-along content</p>
            <p className="text-sm text-muted-foreground">
              {error.message || 'Please try again later'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasReadAlong || !readAlongData) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Read Along
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <EyeOff className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Read-along text is not available for this chapter.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const processedText = processTextForDisplay(
    readAlongData.textContent, 
    readAlongData.segments
  );

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Read Along
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </CardTitle>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowControls(!showControls)}
            className="h-8 px-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-4 pt-3 border-t">
            {/* Text Size Control */}
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {textSizes.find(s => s.value === textSize)?.label}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {textSizes.map((size) => (
                    <DropdownMenuItem
                      key={size.value}
                      onSelect={() => setTextSize(size.value)}
                      className={textSize === size.value ? "bg-primary/10" : ""}
                    >
                      {size.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Auto-scroll Toggle */}
            <div className="flex items-center gap-2">
              <Scroll className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-scroll" className="text-sm">Auto-scroll</Label>
              <Switch
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
                className="scale-75"
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <div 
          ref={textContainerRef}
          className={cn(
            "h-full overflow-y-auto prose prose-slate max-w-none",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
            getTextSizeClass(textSize)
          )}
          style={{
            // Custom scrollbar styles
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 transparent',
          }}
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
                    "transition-all duration-200 cursor-pointer rounded-md px-1 py-0.5",
                    "hover:bg-blue-50 hover:shadow-sm",
                    isActive && [
                      "bg-gradient-to-r from-blue-100 to-blue-50",
                      "border-l-4 border-blue-500",
                      "shadow-md",
                      "font-medium",
                      "text-blue-900"
                    ],
                    !isActive && "text-slate-700 hover:text-slate-900",
                    isParagraph && "block mb-4 p-2"
                  )}
                  title={`Click to jump to ${('startTime' in item ? (item.startTime as number) : 0).toFixed(1)}s`}
                >
                  {isActive && (
                    <PlayCircle className="inline h-4 w-4 mr-1 text-blue-500" />
                  )}
                  {item.content}
                </span>
              );
            })}
          </div>
        </div>
        
        {/* Progress indicator */}
        {readAlongData.segments.length > 0 && activeSegmentIndex >= 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Progress</span>
              <span>
                {activeSegmentIndex + 1} / {readAlongData.segments.filter(s => s.segmentType !== 'word').length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${((activeSegmentIndex + 1) / readAlongData.segments.filter(s => s.segmentType !== 'word').length) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}