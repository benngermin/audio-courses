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
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous"; // Add CORS support
    
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
    if (audioRef.current && audioRef.current.readyState >= 2) {
      try {
        // Mobile Safari requires user interaction before playing
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      } catch (error) {
        // Properly log the error
        if (error instanceof Error) {
          // Only log non-abort errors (AbortError happens when play is interrupted)
          if (error.name !== 'AbortError') {
            console.error('Error playing audio:', error.message, error.name);
            if (error.name === 'NotAllowedError') {
              console.log('Autoplay prevented - user interaction required');
            } else if (error.name === 'NotSupportedError') {
              console.error('Audio format not supported by browser');
            }
          }
        } else {
          console.error('Error playing audio:', String(error));
        }
        // Ensure state reflects that playback failed
        setIsPlaying(false);
      }
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