import { useState, useRef, useEffect, useCallback } from "react";

interface UseOptimizedAudioProps {
  src: string;
  preloadNext?: string[];
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onLoadedMetadata?: (duration: number) => void;
}

// Audio pool to reuse Audio elements and enable preloading
class AudioPool {
  private pool: Map<string, HTMLAudioElement> = new Map();
  private preloadQueue: Set<string> = new Set();
  private maxPoolSize = 5;

  getAudio(src: string): HTMLAudioElement {
    const normalized = this.normalizeUrl(src);
    
    if (this.pool.has(normalized)) {
      return this.pool.get(normalized)!;
    }

    // Clean up old audio elements if pool is full
    if (this.pool.size >= this.maxPoolSize) {
      const oldestKey = this.pool.keys().next().value;
      if (oldestKey) {
        const oldAudio = this.pool.get(oldestKey);
        if (oldAudio) {
          // Proper cleanup to prevent memory leaks
          oldAudio.pause();
          oldAudio.removeAttribute('src');
          oldAudio.load(); // Reset the element
        }
        this.pool.delete(oldestKey);
      }
    }

    const audio = new Audio();
    audio.preload = "auto";  // Changed from metadata to auto for better loading
    // Remove crossOrigin to avoid CORS issues with local files
    // audio.crossOrigin = "anonymous";
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.src = src;
    
    console.log('AudioPool: Creating new audio element for:', src);
    
    this.pool.set(normalized, audio);
    return audio;
  }

  preloadAudio(urls: string[]) {
    urls.forEach(url => {
      const normalized = this.normalizeUrl(url);
      if (!this.pool.has(normalized) && !this.preloadQueue.has(normalized)) {
        this.preloadQueue.add(normalized);
        
        // Preload with lower priority
        requestIdleCallback(() => {
          if (this.preloadQueue.has(normalized)) {
            const audio = new Audio();
            audio.preload = "auto";
            // Remove crossOrigin to avoid CORS issues
            // audio.crossOrigin = "anonymous";
            audio.src = url;
            
            const handleCanPlay = () => {
              this.pool.set(normalized, audio);
              this.preloadQueue.delete(normalized);
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
            };
            
            const handleError = () => {
              this.preloadQueue.delete(normalized);
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
            };
            
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);
          }
        });
      }
    });
  }

  private normalizeUrl(url: string): string {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return new URL(url, window.location.origin).href;
    } catch {
      return url;
    }
  }

  cleanup() {
    this.pool.forEach(audio => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // Reset the element to free memory
      // Remove any event listeners that might still be attached
      audio.onerror = null;
      audio.onloadeddata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
    });
    this.pool.clear();
    this.preloadQueue.clear();
  }
}

// Global audio pool instance
const audioPool = new AudioPool();

export function useOptimizedAudio({ 
  src, 
  preloadNext = [],
  onTimeUpdate, 
  onEnded, 
  onLoadedMetadata 
}: UseOptimizedAudioProps) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Preload next tracks
  useEffect(() => {
    if (preloadNext.length > 0) {
      audioPool.preloadAudio(preloadNext);
    }
  }, [preloadNext]);

  // Initialize audio element
  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    // Clean up previous audio if different source
    if (currentAudioRef.current && currentAudioRef.current.src !== src) {
      const oldAudio = currentAudioRef.current;
      oldAudio.pause();
      setIsPlaying(false);
    }

    const audio = audioPool.getAudio(src);
    currentAudioRef.current = audio;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      setDuration(dur);
      setIsLoading(false);
      onLoadedMetadata?.(dur);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      const error = e.target as HTMLAudioElement;
      console.error("Audio playback error:", {
        error: e,
        src: error.src,
        networkState: error.networkState,
        readyState: error.readyState,
        errorCode: error.error?.code,
        errorMessage: error.error?.message
      });
      
      // Network state codes: 0=NETWORK_EMPTY, 1=NETWORK_IDLE, 2=NETWORK_LOADING, 3=NETWORK_NO_SOURCE
      if (error.networkState === 3) {
        console.error('Audio source not found or format not supported:', src);
      }
      
      setIsLoading(false);
      setIsPlaying(false);
    };

    // Remove existing listeners
    audio.removeEventListener("timeupdate", handleTimeUpdate);
    audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    audio.removeEventListener("ended", handleEnded);
    audio.removeEventListener("canplay", handleCanPlay);
    audio.removeEventListener("waiting", handleWaiting);
    audio.removeEventListener("canplaythrough", handleCanPlayThrough);
    audio.removeEventListener("error", handleError);

    // Add new listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);
    audio.addEventListener("error", handleError);

    // Set initial values if already loaded
    if (audio.duration) {
      setDuration(audio.duration);
      setIsLoading(false);
    }
    if (audio.currentTime) {
      setCurrentTime(audio.currentTime);
    }

    // Start smooth progress updates
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Don't remove listeners here as audio element is reused
    };
  }, [src, onTimeUpdate, onEnded, onLoadedMetadata]);

  const play = useCallback(async () => {
    const audio = currentAudioRef.current;
    if (!audio) {
      console.error('No audio element available');
      return;
    }

    try {
      console.log('Attempting to play audio:', {
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
        paused: audio.paused
      });
      
      // If audio is not loaded, load it first
      if (audio.readyState === 0) {
        console.log('Audio not loaded, loading now...');
        audio.load();
        
        // Wait for audio to be ready with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Audio load timeout'));
          }, 10000); // 10 second timeout
          
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
      
      // Try to play the audio
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Audio playing successfully');
        setIsPlaying(true);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Play request was interrupted');
        } else if (error.name === 'NotAllowedError') {
          console.error('Audio playback not allowed. User interaction may be required:', error);
        } else if (error.name === 'NotSupportedError') {
          console.error('Audio format not supported:', error);
        } else {
          console.error('Error playing audio:', error.name, error.message);
        }
      } else {
        console.error('Unknown error playing audio:', error);
      }
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.pause();
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
    const audio = currentAudioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipForward = useCallback((seconds: number = 15) => {
    const audio = currentAudioRef.current;
    if (audio) {
      const newTime = Math.min(audio.currentTime + seconds, duration);
      seek(newTime);
    }
  }, [seek, duration]);

  const skipBackward = useCallback((seconds: number = 15) => {
    const audio = currentAudioRef.current;
    if (audio) {
      const newTime = Math.max(audio.currentTime - seconds, 0);
      seek(newTime);
    }
  }, [seek]);

  const changePlaybackRate = useCallback((rate: number) => {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const changeVolume = useCallback((vol: number) => {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      if (isMuted) {
        audio.volume = volume;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Setup Media Session API
  useEffect(() => {
    const audio = currentAudioRef.current;
    if ('mediaSession' in navigator && audio) {
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => skipBackward(15));
      navigator.mediaSession.setActionHandler('seekforward', () => skipForward(15));
    }
  }, [play, pause, skipBackward, skipForward]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

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

// Cleanup function for the audio pool
export const cleanupAudioPool = () => {
  audioPool.cleanup();
};