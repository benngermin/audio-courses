import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Chapter, Assignment } from '@shared/schema';

interface AudioContextType {
  currentChapter: Chapter | null;
  currentAssignment: Assignment | null;
  isPlaying: boolean;
  isExpanded: boolean;
  isPlayAllMode: boolean;
  isReadAlongVisible: boolean;
  setCurrentTrack: (chapter: Chapter, assignment: Assignment) => void;
  clearCurrentTrack: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsExpanded: (expanded: boolean) => void;
  setIsPlayAllMode: (playAll: boolean) => void;
  setIsReadAlongVisible: (visible: boolean) => void;
  toggleExpanded: () => void;
  // Shared audio controls
  audioControls: {
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    skipForward: (seconds: number) => void;
    skipBackward: (seconds: number) => void;
    changePlaybackRate: (rate: number) => void;
    changeVolume: (volume: number) => void;
    toggleMute: () => void;
  } | null;
  setAudioControls: (controls: AudioContextType['audioControls']) => void;
  // Shared audio state
  audioState: {
    currentTime: number;
    duration: number;
    volume: number;
    playbackRate: number;
    isMuted: boolean;
  };
  setAudioState: (state: AudioContextType['audioState']) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlayAllMode, setIsPlayAllMode] = useState(false);
  const [isReadAlongVisible, setIsReadAlongVisible] = useState(false);
  const [audioControls, setAudioControls] = useState<AudioContextType['audioControls']>(null);
  const [audioState, setAudioState] = useState<AudioContextType['audioState']>({
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isMuted: false,
  });

  const setCurrentTrack = useCallback((chapter: Chapter, assignment: Assignment) => {
    setCurrentChapter(chapter);
    setCurrentAssignment(assignment);
    // Don't set isPlaying here - let the audio hook manage it
    // Don't auto-expand, let user click to expand
  }, []);

  const clearCurrentTrack = useCallback(() => {
    setCurrentChapter(null);
    setCurrentAssignment(null);
    setIsPlaying(false);
    setIsExpanded(false);
    setIsPlayAllMode(false);
    setIsReadAlongVisible(false);
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
        isPlayAllMode,
        isReadAlongVisible,
        setCurrentTrack,
        clearCurrentTrack,
        setIsPlaying,
        setIsExpanded,
        setIsPlayAllMode,
        setIsReadAlongVisible,
        toggleExpanded,
        audioControls,
        setAudioControls,
        audioState,
        setAudioState,
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