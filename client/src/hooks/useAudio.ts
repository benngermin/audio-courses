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
    console.log("Initializing audio with src:", src);
    if (!src) {
      console.error("No audio source provided!");
      setIsLoading(false);
      return;
    }
    
    const audio = new Audio(src);
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous"; // Add CORS support
    audioRef.current = audio;
    
    // Test if the audio URL is accessible
    fetch(src, { method: 'HEAD' })
      .then(response => {
        console.log("Audio URL test - status:", response.status, "ok:", response.ok);
        if (!response.ok) {
          console.error("Audio URL not accessible:", response.status, response.statusText);
        }
      })
      .catch(error => {
        console.error("Failed to fetch audio URL:", error);
      });

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      console.log("Audio metadata loaded - duration:", dur, "src:", audio.src);
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
      console.error("Audio error:", e);
      const audioError = audio.error;
      if (audioError) {
        console.error("Audio error details:", {
          code: audioError.code,
          message: audioError.message,
          src: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState
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
            break;
        }
      }
      setIsLoading(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.pause();
    };
  }, [src, onTimeUpdate, onEnded, onLoadedMetadata]);

  const play = useCallback(async () => {
    if (audioRef.current) {
      console.log("Play button clicked - attempting to play audio");
      console.log("Audio state:", {
        src: audioRef.current.src,
        readyState: audioRef.current.readyState,
        paused: audioRef.current.paused,
        duration: audioRef.current.duration
      });
      try {
        await audioRef.current.play();
        console.log("Audio playback started successfully");
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      }
    } else {
      console.error("No audio element available");
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
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('seekbackward', () => skipBackward());
      navigator.mediaSession.setActionHandler('seekforward', () => skipForward());
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
