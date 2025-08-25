import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ReadAlongSegment } from '@shared/schema';

interface WordHighlighterProps {
  text: string;
  segments: ReadAlongSegment[];
  currentTime: number;
  onWordClick?: (time: number) => void;
  className?: string;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export function WordHighlighter({
  text,
  segments,
  currentTime,
  onWordClick,
  className,
  textSize = 'md'
}: WordHighlighterProps) {
  
  const processedWords = useMemo(() => {
    if (!segments || segments.length === 0) {
      return text.split(/(\s+)/).map((word, index) => ({
        text: word,
        isWord: /\S/.test(word),
        isHighlighted: false,
        startTime: 0,
        endTime: 0,
        index
      }));
    }

    // Create word segments with timing
    const words = [];
    let textIndex = 0;
    
    // Sort segments by start time for processing
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
    
    for (const segment of sortedSegments) {
      if (segment.segmentType !== 'word') continue;
      
      const segmentStart = segment.characterStart || 0;
      const segmentEnd = segment.characterEnd || segment.text.length;
      
      // Add any text before this segment
      if (segmentStart > textIndex) {
        const beforeText = text.slice(textIndex, segmentStart);
        beforeText.split(/(\s+)/).forEach((part, idx) => {
          if (part.length > 0) {
            words.push({
              text: part,
              isWord: /\S/.test(part),
              isHighlighted: false,
              startTime: 0,
              endTime: 0,
              index: words.length
            });
          }
        });
      }
      
      // Add the timed word segment
      words.push({
        text: segment.text,
        isWord: true,
        isHighlighted: currentTime >= segment.startTime && currentTime <= segment.endTime,
        startTime: segment.startTime,
        endTime: segment.endTime,
        index: words.length
      });
      
      textIndex = segmentEnd;
    }
    
    // Add any remaining text
    if (textIndex < text.length) {
      const remainingText = text.slice(textIndex);
      remainingText.split(/(\s+)/).forEach((part, idx) => {
        if (part.length > 0) {
          words.push({
            text: part,
            isWord: /\S/.test(part),
            isHighlighted: false,
            startTime: 0,
            endTime: 0,
            index: words.length
          });
        }
      });
    }
    
    return words;
  }, [text, segments, currentTime]);

  const getTextSizeClass = (size: typeof textSize) => {
    const sizeMap = {
      sm: 'text-sm leading-6',
      md: 'text-base leading-7', 
      lg: 'text-lg leading-8',
      xl: 'text-xl leading-9'
    };
    return sizeMap[size];
  };

  const handleWordClick = (word: typeof processedWords[0]) => {
    if (word.isWord && word.startTime > 0 && onWordClick) {
      onWordClick(word.startTime);
    }
  };

  return (
    <div className={cn("select-text", getTextSizeClass(textSize), className)}>
      {processedWords.map((word, index) => {
        if (!word.isWord) {
          // Whitespace or punctuation
          return <span key={index}>{word.text}</span>;
        }

        return (
          <span
            key={index}
            onClick={() => handleWordClick(word)}
            className={cn(
              "transition-all duration-200 rounded-sm px-0.5",
              word.startTime > 0 && [
                "cursor-pointer hover:bg-blue-50 hover:shadow-sm"
              ],
              word.isHighlighted && [
                "bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200",
                "text-yellow-900 font-medium",
                "shadow-sm border-b-2 border-yellow-400",
                "animate-pulse-subtle"
              ]
            )}
            title={word.startTime > 0 ? `Jump to ${word.startTime.toFixed(1)}s` : undefined}
            style={{
              // Custom animation for highlighted words
              ...(word.isHighlighted && {
                animationDuration: '2s',
                animationIterationCount: 'infinite'
              })
            }}
          >
            {word.text}
          </span>
        );
      })}
      
      <style>{`
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}