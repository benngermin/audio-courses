import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getDemoReadAlongData } from '@/utils/readAlongDemo';
import type { ReadAlongData, ReadAlongSegment } from '@shared/schema';

interface UseReadAlongProps {
  chapterId: string;
  currentTime: number;
  isPlaying: boolean;
  enabled?: boolean;
}

export function useReadAlong({ chapterId, currentTime, isPlaying, enabled = true }: UseReadAlongProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const lastUpdateTimeRef = useRef<number>(0);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Fetch read-along data with proper error handling
  const { data: readAlongData, isLoading, error } = useQuery<ReadAlongData>({
    queryKey: ['/api/read-along', chapterId],
    queryFn: async () => {
      // Try API call first for production data
      try {
        return await apiRequest('GET', `/api/read-along/${chapterId}`);
      } catch (apiError) {
        console.warn(`API call failed for read-along data (chapter: ${chapterId}):`, apiError);
        
        // Fall back to demo data only if API fails
        const demoData = getDemoReadAlongData(chapterId);
        if (demoData) {
          console.info(`Using demo data for chapter: ${chapterId}`);
          return demoData;
        }
        
        // If both API and demo fail, throw error for proper error handling
        throw new Error(`No read-along data available for chapter: ${chapterId}`);
      }
    },
    enabled: enabled && !!chapterId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Retry API failures up to 2 times, but don't retry if no data exists
      return failureCount < 2 && !error.message.includes('No read-along data available');
    },
  });

  // Find active segment based on current time
  const findActiveSegment = useCallback((time: number, segments: ReadAlongSegment[]) => {
    if (!segments || segments.length === 0) return -1;
    
    // Binary search for efficiency with large text segments
    let left = 0;
    let right = segments.length - 1;
    let result = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = segments[mid];
      
      if (time >= segment.startTime && time <= segment.endTime) {
        return mid;
      } else if (time < segment.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
        if (time > segment.endTime) {
          result = mid; // Keep track of the last passed segment
        }
      }
    }
    
    return result;
  }, []);

  // Update active segment when time changes
  useEffect(() => {
    if (!readAlongData?.segments || !isPlaying) return;
    
    // Throttle updates to avoid excessive re-renders
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 100) return; // Update max 10x per second
    lastUpdateTimeRef.current = now;
    
    const newActiveIndex = findActiveSegment(currentTime, readAlongData.segments);
    
    if (newActiveIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(newActiveIndex);
      
      // Update highlighted words for word-level sync
      const activeSegment = readAlongData.segments[newActiveIndex];
      if (activeSegment?.segmentType === 'word') {
        setHighlightedWords(prev => new Set(prev).add(newActiveIndex));
      } else {
        // For sentence/paragraph level, highlight all words in the segment
        const wordsInSegment = readAlongData.segments
          .filter((seg, idx) => 
            seg.segmentType === 'word' && 
            seg.startTime >= (activeSegment?.startTime || 0) &&
            seg.endTime <= (activeSegment?.endTime || 0)
          )
          .map((_, idx) => idx);
        setHighlightedWords(new Set(wordsInSegment));
      }
    }
  }, [currentTime, isPlaying, readAlongData?.segments, activeSegmentIndex, findActiveSegment]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (!autoScroll || activeSegmentIndex < 0 || !textContainerRef.current) return;
    
    const activeElement = textContainerRef.current.querySelector(
      `[data-segment-index="${activeSegmentIndex}"]`
    ) as HTMLElement;
    
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Text size helpers
  const getTextSizeClass = useCallback((size: typeof textSize) => {
    const sizeMap = {
      sm: 'text-sm leading-6',
      md: 'text-base leading-7',
      lg: 'text-lg leading-8',
      xl: 'text-xl leading-9'
    };
    return sizeMap[size];
  }, []);

  // Segment highlighting helpers
  const isSegmentActive = useCallback((segmentIndex: number) => {
    return segmentIndex === activeSegmentIndex;
  }, [activeSegmentIndex]);

  const isWordHighlighted = useCallback((wordIndex: number) => {
    return highlightedWords.has(wordIndex);
  }, [highlightedWords]);

  // Seek to segment (for click-to-play functionality)
  const seekToSegment = useCallback((segmentIndex: number) => {
    if (!readAlongData?.segments || segmentIndex < 0 || segmentIndex >= readAlongData.segments.length) {
      return null;
    }
    return readAlongData.segments[segmentIndex].startTime;
  }, [readAlongData?.segments]);

  // Text processing utilities
  const processTextForDisplay = useCallback((text: string, segments: ReadAlongSegment[]) => {
    if (!segments || segments.length === 0) {
      return [{ type: 'text', content: text, segmentIndex: -1 }];
    }

    const processed = [];
    let lastEndIndex = 0;

    segments
      .filter(seg => seg.segmentType === 'sentence' || seg.segmentType === 'paragraph')
      .sort((a, b) => a.segmentIndex - b.segmentIndex)
      .forEach((segment, idx) => {
        const startIndex = segment.characterStart || 0;
        const endIndex = segment.characterEnd || text.length;

        // Add any text before this segment
        if (startIndex > lastEndIndex) {
          processed.push({
            type: 'text',
            content: text.slice(lastEndIndex, startIndex),
            segmentIndex: -1
          });
        }

        // Add the segment
        processed.push({
          type: 'segment',
          content: segment.text,
          segmentIndex: segment.segmentIndex,
          segmentType: segment.segmentType,
          startTime: segment.startTime,
          endTime: segment.endTime
        });

        lastEndIndex = endIndex;
      });

    // Add any remaining text
    if (lastEndIndex < text.length) {
      processed.push({
        type: 'text',
        content: text.slice(lastEndIndex),
        segmentIndex: -1
      });
    }

    return processed;
  }, []);

  return {
    // Data
    readAlongData: readAlongData || {
      chapterId: chapterId || '',
      textContent: '',
      hasReadAlong: false,
      segments: []
    },
    isLoading,
    error,
    hasReadAlong: readAlongData?.hasReadAlong || false,
    
    // State
    activeSegmentIndex,
    highlightedWords,
    textSize,
    autoScroll,
    
    // Setters
    setTextSize,
    setAutoScroll,
    
    // Helpers
    isSegmentActive,
    isWordHighlighted,
    seekToSegment,
    getTextSizeClass,
    processTextForDisplay,
    
    // Refs
    textContainerRef,
  };
}