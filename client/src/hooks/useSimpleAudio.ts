import { useState, useRef, useEffect, useCallback } from "react";

interface UseSimpleAudioProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onLoadedMetadata?: (duration: number) => void;
}

// Global audio element - created only once on first user interaction
let globalAudioElement: HTMLAudioElement | null = null;

export function useSimpleAudio({ 
  src, 
  onTimeUpdate, 
  onEnded, 
  onLoadedMetadata 
}: UseSimpleAudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Store callbacks as refs to avoid effect dependencies
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const onLoadedMetadataRef = useRef(onLoadedMetadata);
  
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onEndedRef.current = onEnded;
    onLoadedMetadataRef.current = onLoadedMetadata;
  }, [onTimeUpdate, onEnded, onLoadedMetadata]);

  // Initialize or update audio source
  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    // If we have a global audio element, update its source
    if (globalAudioElement) {
      const audio = globalAudioElement;
      
      // Only update if source actually changed
      const normalizedSrc = src.startsWith('http') ? src : new URL(src, window.location.origin).href;
      const currentSrc = audio.src;
      
      if (currentSrc !== normalizedSrc) {
        console.log('Updating audio source:', src);
        
        // Pause current playback
        audio.pause();
        setIsPlaying(false);
        
        // Update source
        audio.src = src;
        audio.load();
      }
      
      setIsLoading(false);
    } else {
      // No audio element yet - will be created on first play
      setIsLoading(false);
    }
  }, [src]);

  // Setup event listeners when audio element exists
  useEffect(() => {
    if (!globalAudioElement) return;
    
    const audio = globalAudioElement;
    
    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdateRef.current?.(time);
    };

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      setDuration(dur);
      setIsLoading(false);
      onLoadedMetadataRef.current?.(dur);
    };

    const handleEnded = () => {
      console.log('Audio ended');
      setIsPlaying(false);
      onEndedRef.current?.();
    };

    const handlePlay = () => {
      console.log('Audio playing');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('Audio paused');
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      console.error('Audio error:', {
        error: audioEl.error,
        src: audioEl.src,
        readyState: audioEl.readyState,
        networkState: audioEl.networkState
      });
      setIsLoading(false);
      setIsPlaying(false);
    };

    // Add event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("error", handleError);

    // Set initial values if already loaded
    if (audio.duration) {
      setDuration(audio.duration);
    }
    if (audio.currentTime) {
      setCurrentTime(audio.currentTime);
    }
    setIsPlaying(!audio.paused);

    // Smooth progress updates
    const progressInterval = setInterval(() => {
      if (!audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    }, 100);

    return () => {
      clearInterval(progressInterval);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("error", handleError);
    };
  }, [!!globalAudioElement]); // Re-run when audio element is created

  const createAudioElement = useCallback(() => {
    if (!globalAudioElement) {
      console.log('Creating audio element on user interaction');
      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      
      // Set initial source if we have one
      if (src) {
        audio.src = src;
      }
      
      globalAudioElement = audio;
      
      // Force a re-render to attach event listeners
      setIsLoading(false);
    }
    return globalAudioElement;
  }, [src]);

  const play = useCallback(async (): Promise<boolean> => {
    try {
      // Create audio element on first play (user interaction)
      const audio = globalAudioElement || createAudioElement();
      
      if (!audio) {
        console.error('Failed to create audio element');
        return false;
      }
      
      // Ensure we have the correct source
      if (src && audio.src !== src) {
        const normalizedSrc = src.startsWith('http') ? src : new URL(src, window.location.origin).href;
        if (audio.src !== normalizedSrc) {
          audio.src = src;
          audio.load();
        }
      }
      
      console.log('Playing audio:', {
        src: audio.src,
        readyState: audio.readyState,
        paused: audio.paused
      });
      
      // Wait for audio to be ready if needed
      if (audio.readyState === 0) {
        console.log('Waiting for audio to load...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Load timeout')), 5000);
          
          const handleCanPlay = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            resolve(void 0);
          };
          
          const handleError = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            reject(new Error('Audio failed to load'));
          };
          
          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('error', handleError);
        });
      }
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Audio playing successfully');
        setIsPlaying(true);
        return true;
      }
      
      return false;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Play error:', error.name, error.message);
        if (error.name === 'NotAllowedError') {
          console.error('Autoplay blocked - user interaction required');
        }
      }
      setIsPlaying(false);
      return false;
    }
  }, [src, createAudioElement]);

  const pause = useCallback(() => {
    if (globalAudioElement) {
      globalAudioElement.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (globalAudioElement) {
      globalAudioElement.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipForward = useCallback((seconds: number = 15) => {
    if (globalAudioElement) {
      const newTime = Math.min(globalAudioElement.currentTime + seconds, duration);
      seek(newTime);
    }
  }, [seek, duration]);

  const skipBackward = useCallback((seconds: number = 15) => {
    if (globalAudioElement) {
      const newTime = Math.max(globalAudioElement.currentTime - seconds, 0);
      seek(newTime);
    }
  }, [seek]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (globalAudioElement) {
      globalAudioElement.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const changeVolume = useCallback((vol: number) => {
    if (globalAudioElement) {
      globalAudioElement.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (globalAudioElement) {
      if (isMuted) {
        globalAudioElement.volume = volume;
        setIsMuted(false);
      } else {
        globalAudioElement.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Media Session API
  useEffect(() => {
    if ('mediaSession' in navigator && globalAudioElement) {
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => skipBackward(15));
      navigator.mediaSession.setActionHandler('seekforward', () => skipForward(15));
    }
  }, [play, pause, skipBackward, skipForward]);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isLoading,
    play,
    pause,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
    changePlaybackRate,
    changeVolume,
    toggleMute,
  };
}