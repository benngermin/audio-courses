import { useState, useRef, useEffect, useCallback } from "react";

interface UseAudioProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onLoadedMetadata?: (duration: number) => void;
}

export function useAudio({ src, onTimeUpdate, onEnded, onLoadedMetadata }: UseAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize audio element
  useEffect(() => {
    // Only initialize if src changes and is not empty
    if (!src) {
      setIsLoading(false);
      return;
    }

    // Normalize URLs for comparison
    const normalizeUrl = (url: string) => {
      try {
        // If it's already a full URL, return it
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        // Otherwise, construct full URL based on current origin
        return new URL(url, window.location.origin).href;
      } catch {
        return url;
      }
    };

    const normalizedSrc = normalizeUrl(src);
    
    // If we already have an audio element with the same src, don't recreate it
    if (audioRef.current && normalizeUrl(audioRef.current.src) === normalizedSrc) {
      // Audio element already exists with same source, just ensure it's ready
      setIsLoading(false);
      return;
    }

    // Pause and clean up previous audio if switching to a new track
    if (audioRef.current) {
      audioRef.current.pause();
      // Remove all event listeners from old audio element
      const oldAudio = audioRef.current;
      // We'll clean up listeners below, just pause here
      setIsPlaying(false);
    }

    console.log('Creating new audio element for:', src);
    const audio = new Audio();
    // Important for iOS: set preload to 'auto' for better compatibility
    audio.preload = "auto";
    // Remove crossOrigin to avoid CORS issues with local files
    // audio.crossOrigin = "anonymous";
    // iOS specific: enable inline playback
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    
    // Set the source after configuring the audio element
    audio.src = src;
    audioRef.current = audio;

    // Remove HEAD request check - let the audio element handle loading
    // The audio element's error event will catch any loading issues

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
      console.log('🎵 Audio ended event fired! Button should now show play icon.');
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

    const handlePlay = () => {
      console.log('Audio play event fired');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('Audio pause event fired');
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      const audioError = audio.error;
      if (audioError) {
        console.error("Audio error details:", {
          code: audioError.code,
          message: audioError.message,
          src: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState,
          currentSrc: audio.currentSrc
        });
        // Log specific error codes
        switch(audioError.code) {
          case 1:
            console.error("MEDIA_ERR_ABORTED: The user aborted the media playback");
            break;
          case 2:
            console.error("MEDIA_ERR_NETWORK: A network error occurred");
            break;
          case 3:
            console.error("MEDIA_ERR_DECODE: Error decoding the media");
            break;
          case 4:
            console.error("MEDIA_ERR_SRC_NOT_SUPPORTED: The media format is not supported");
            // Try to provide a fallback or better error message
            console.error("Browser may not support the audio format.");
            break;
        }
      } else {
        console.error("Audio error event:", e);
      }
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    // Remove verbose logging
    // audio.addEventListener("loadstart", () => console.log("Audio load started for:", src));
    // audio.addEventListener("loadeddata", () => console.log("Audio data loaded for:", src));
    


    // Add interval for smooth progress updates
    const progressInterval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100); // Update every 100ms for smooth animation

    return () => {
      clearInterval(progressInterval);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      // Don't set src to empty string as it causes AbortError
      // Just pause the audio and keep the reference
      if (audioRef.current === audio) {
        audio.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [src]); // Only depend on src, callbacks are stable via useCallback in parent

  const play = useCallback(async () => {
    const audio = audioRef.current;
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
      
      // For iOS Safari: ensure we have the audio loaded before trying to play
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
      
      // CRITICAL FIX: Force audio context to be in 'running' state
      // This ensures browser allows audio playback
      if (typeof window !== 'undefined' && window.AudioContext) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('Audio context resumed');
          }
          audioContext.close(); // Clean up temporary context
        } catch (e) {
          console.log('AudioContext not available or failed to resume:', e);
        }
      }
      
      // Try to play the audio with immediate state check
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Play promise resolved successfully');
        
        // Immediate check instead of setTimeout
        if (audio.paused) {
          console.error('AUTOPLAY BLOCKED: Audio is still paused after play() resolved');
          setIsPlaying(false);
          
          // Try one more time with a brief delay
          setTimeout(async () => {
            try {
              await audio.play();
              if (!audio.paused) {
                console.log('Second play attempt successful');
                setIsPlaying(true);
              } else {
                console.error('Second play attempt also blocked');
                setIsPlaying(false);
              }
            } catch (e) {
              console.error('Second play attempt failed:', e);
              setIsPlaying(false);
            }
          }, 50);
        } else {
          console.log('Audio playing successfully');
          setIsPlaying(true);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Play request was interrupted');
        } else if (error.name === 'NotAllowedError') {
          console.error('Audio playback not allowed. User interaction may be required:', error);
          // Try to unlock audio with a user gesture simulation
          try {
            // Create a silent audio element to unlock audio context
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAASAATGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
            silentAudio.volume = 0.01;
            await silentAudio.play();
            silentAudio.pause();
            
            // Now try original audio again
            await audio.play();
            if (!audio.paused) {
              console.log('Audio unlocked and playing');
              setIsPlaying(true);
            }
          } catch (unlockError) {
            console.error('Failed to unlock audio:', unlockError);
          }
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
    if (audioRef.current) {
      audioRef.current.pause();
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
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipForward = useCallback((seconds: number = 15) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
      seek(newTime);
    }
  }, [seek, duration]);

  const skipBackward = useCallback((seconds: number = 15) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      seek(newTime);
    }
  }, [seek]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const changeVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Setup Media Session API for background playback controls
  useEffect(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (audioRef.current) {
          const newTime = Math.max(audioRef.current.currentTime - 15, 0);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (audioRef.current) {
          const newTime = Math.min(audioRef.current.currentTime + 15, audioRef.current.duration);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      });
    }
  }, [src]); // Only re-register when src changes

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