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

  // Find active segment based on current time using binary search for efficiency
  const findActiveSegment = useCallback((time: number, segments: ReadAlongSegment[]) => {
    if (!segments || segments.length === 0) return -1;
    
    // Filter for sentence segments only and sort by startTime
    const sentenceSegments = segments
      .filter(seg => seg.segmentType === 'sentence')
      .sort((a, b) => a.startTime - b.startTime);
    
    if (sentenceSegments.length === 0) return -1;
    
    // Binary search for the active segment (O(log n) complexity as per documentation)
    let left = 0;
    let right = sentenceSegments.length - 1;
    let activeIndex = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = sentenceSegments[mid];
      
      // Check if current time is within this segment (with small buffer for edge cases)
      if (time >= segment.startTime - 0.05 && time <= segment.endTime + 0.05) {
        return segment.segmentIndex;
      }
      
      if (time < segment.startTime) {
        right = mid - 1;
      } else {
        // Time is past this segment's end, this could be our active segment
        // if there's no next segment or next segment hasn't started yet
        activeIndex = segment.segmentIndex;
        left = mid + 1;
      }
    }
    
    // Return the last segment that has started
    return activeIndex;
  }, []);

  // Update active segment when time changes with proper throttling
  useEffect(() => {
    if (!readAlongData?.segments || !isPlaying) return;
    
    // Throttle updates to prevent excessive re-renders (50ms as per documentation)
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 50) {
      return;
    }
    
    const newActiveIndex = findActiveSegment(currentTime, readAlongData.segments);
    
    if (newActiveIndex !== activeSegmentIndex) {
      lastUpdateTimeRef.current = now;
      setActiveSegmentIndex(newActiveIndex);
      
      // Update highlighted words for word-level sync
      const activeSegment = readAlongData.segments.find(seg => seg.segmentIndex === newActiveIndex);
      if (activeSegment?.segmentType === 'word') {
        setHighlightedWords(prev => new Set(prev).add(newActiveIndex));
      } else if (activeSegment) {
        // For sentence/paragraph level, highlight all words in the segment
        const wordsInSegment = readAlongData.segments
          .filter((seg) => 
            seg.segmentType === 'word' && 
            seg.startTime >= activeSegment.startTime &&
            seg.endTime <= activeSegment.endTime
          )
          .map((seg) => seg.segmentIndex);
        setHighlightedWords(new Set(wordsInSegment));
      }
    }
  }, [currentTime, readAlongData?.segments, activeSegmentIndex, findActiveSegment, isPlaying]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (!autoScroll || activeSegmentIndex < 0 || !textContainerRef.current) return;
    
    // Add a small delay to ensure DOM is updated
    const scrollTimeout = setTimeout(() => {
      const activeElement = textContainerRef.current?.querySelector(
        `[data-segment-index="${activeSegmentIndex}"]`
      ) as HTMLElement;
      
      if (activeElement && textContainerRef.current) {
        // Calculate if element is already visible
        const containerRect = textContainerRef.current.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();
        const isVisible = 
          elementRect.top >= containerRect.top && 
          elementRect.bottom <= containerRect.bottom;
        
        // Only scroll if element is not fully visible
        if (!isVisible) {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }
    }, 50);
    
    return () => clearTimeout(scrollTimeout);
  }, [activeSegmentIndex, autoScroll]);

  // Text size helpers
  const getTextSizeClass = useCallback((size: typeof textSize) => {
    const sizeMap = {
      sm: 'text-sm',
      md: '',  // Default size, no class needed
      lg: 'text-lg',
      xl: 'text-xl'
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

    // Filter and sort segments by sentence type only, and clean up the text
    const sentenceSegments = segments
      .filter(seg => seg.segmentType === 'sentence')
      .sort((a, b) => a.segmentIndex - b.segmentIndex)
      .map(segment => ({
        ...segment,
        // Clean up any leading/trailing whitespace and normalize the text
        text: segment.text.trim()
      }));

    // Convert each sentence segment into its own paragraph for clean display
    return sentenceSegments.map(segment => ({
      type: 'segment',
      content: segment.text,
      segmentIndex: segment.segmentIndex,
      segmentType: 'sentence', // Always treat as sentence for consistent formatting
      startTime: segment.startTime,
      endTime: segment.endTime
    }));
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