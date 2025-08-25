import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import type { Chapter, Assignment } from '@shared/schema';

interface AudioControlsType {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  changePlaybackRate: (rate: number) => void;
  changeVolume: (volume: number) => void;
  toggleMute: () => void;
}

interface AudioStateType {
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
}

interface AudioContextType {
  // Track info (changes less frequently)
  currentChapter: Chapter | null;
  currentAssignment: Assignment | null;
  
  // Playback state (changes frequently)
  isPlaying: boolean;
  isExpanded: boolean;
  isReadAlongVisible: boolean;
  
  // Actions (stable references)
  setCurrentTrack: (chapter: Chapter, assignment: Assignment) => void;
  clearCurrentTrack: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsExpanded: (expanded: boolean) => void;
  setIsReadAlongVisible: (visible: boolean) => void;
  toggleExpanded: () => void;
  toggleReadAlong: () => void;
  
  // Audio controls (stable reference)
  audioControls: AudioControlsType | null;
  setAudioControls: (controls: AudioControlsType | null) => void;
  
  // Audio state (frequently changing)
  audioState: AudioStateType;
  setAudioState: (state: AudioStateType) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function OptimizedAudioProvider({ children }: { children: ReactNode }) {
  // Track state (changes infrequently)
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  
  // UI state (changes infrequently)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReadAlongVisible, setIsReadAlongVisible] = useState(false);
  
  // Audio controls (stable reference)
  const [audioControls, setAudioControls] = useState<AudioControlsType | null>(null);
  
  // Audio state (changes frequently - needs optimization)
  const [audioState, setAudioState] = useState<AudioStateType>({
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isMuted: false,
  });

  // Memoized stable callbacks
  const setCurrentTrack = useCallback((chapter: Chapter, assignment: Assignment) => {
    setCurrentChapter(prevChapter => {
      if (prevChapter?.id === chapter.id) return prevChapter;
      return chapter;
    });
    setCurrentAssignment(prevAssignment => {
      if (prevAssignment?.id === assignment.id) return prevAssignment;
      return assignment;
    });
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

  const toggleReadAlong = useCallback(() => {
    setIsReadAlongVisible(prev => !prev);
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  // Note: audioState is intentionally NOT in dependency array to prevent
  // excessive re-renders from currentTime updates. Components that need
  // audioState should use the useAudioState hook directly.
  const contextValue = useMemo(() => ({
    currentChapter,
    currentAssignment,
    isPlaying,
    isExpanded,
    isReadAlongVisible,
    setCurrentTrack,
    clearCurrentTrack,
    setIsPlaying,
    setIsExpanded,
    setIsReadAlongVisible,
    toggleExpanded,
    toggleReadAlong,
    audioControls,
    setAudioControls,
    audioState,
    setAudioState,
  }), [
    currentChapter,
    currentAssignment,
    isPlaying,
    isExpanded,
    isReadAlongVisible,
    setCurrentTrack,
    clearCurrentTrack,
    toggleExpanded,
    toggleReadAlong,
    audioControls,
    // audioState deliberately excluded to prevent currentTime re-renders
  ]);

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
}

// Hook with selector pattern to minimize re-renders
export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within OptimizedAudioProvider');
  }
  return context;
}

// Specialized hooks for different data slices to reduce re-renders
export function useCurrentTrack() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useCurrentTrack must be used within OptimizedAudioProvider');
  }
  
  return useMemo(() => ({
    currentChapter: context.currentChapter,
    currentAssignment: context.currentAssignment,
    setCurrentTrack: context.setCurrentTrack,
    clearCurrentTrack: context.clearCurrentTrack,
  }), [context.currentChapter, context.currentAssignment, context.setCurrentTrack, context.clearCurrentTrack]);
}

export function usePlaybackState() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('usePlaybackState must be used within OptimizedAudioProvider');
  }
  
  return useMemo(() => ({
    isPlaying: context.isPlaying,
    isExpanded: context.isExpanded,
    isReadAlongVisible: context.isReadAlongVisible,
    setIsPlaying: context.setIsPlaying,
    setIsExpanded: context.setIsExpanded,
    setIsReadAlongVisible: context.setIsReadAlongVisible,
    toggleExpanded: context.toggleExpanded,
    toggleReadAlong: context.toggleReadAlong,
  }), [
    context.isPlaying,
    context.isExpanded,
    context.isReadAlongVisible,
    context.setIsPlaying,
    context.setIsExpanded,
    context.setIsReadAlongVisible,
    context.toggleExpanded,
    context.toggleReadAlong,
  ]);
}

export function useAudioControls() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioControls must be used within OptimizedAudioProvider');
  }
  
  return useMemo(() => ({
    audioControls: context.audioControls,
    setAudioControls: context.setAudioControls,
  }), [context.audioControls, context.setAudioControls]);
}

export function useAudioState() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioState must be used within OptimizedAudioProvider');
  }
  
  return useMemo(() => ({
    audioState: context.audioState,
    setAudioState: context.setAudioState,
  }), [context.audioState, context.setAudioState]);
}