import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Chapter, Assignment } from '@shared/schema';

interface AudioContextType {
  currentChapter: Chapter | null;
  currentAssignment: Assignment | null;
  isPlaying: boolean;
  isExpanded: boolean;
  setCurrentTrack: (chapter: Chapter, assignment: Assignment) => void;
  clearCurrentTrack: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const setCurrentTrack = useCallback((chapter: Chapter, assignment: Assignment) => {
    setCurrentChapter(chapter);
    setCurrentAssignment(assignment);
    setIsPlaying(true);
    // Don't auto-expand, let user click to expand
  }, []);

  const clearCurrentTrack = useCallback(() => {
    setCurrentChapter(null);
    setCurrentAssignment(null);
    setIsPlaying(false);
    setIsExpanded(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentChapter,
        currentAssignment,
        isPlaying,
        isExpanded,
        setCurrentTrack,
        clearCurrentTrack,
        setIsPlaying,
        setIsExpanded,
        toggleExpanded,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within AudioProvider');
  }
  return context;
}