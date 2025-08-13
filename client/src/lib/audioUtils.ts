export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unknown duration";
  return formatTime(seconds);
}

export function calculateProgress(currentTime: number, duration: number): number {
  if (!duration) return 0;
  return Math.min((currentTime / duration) * 100, 100);
}

export function getRemainingTime(currentTime: number, duration: number): number {
  if (!duration || currentTime >= duration) return 0;
  return duration - currentTime;
}

export function isNearEnd(currentTime: number, duration: number, threshold: number = 30): boolean {
  if (!duration) return false;
  return getRemainingTime(currentTime, duration) <= threshold;
}

export function createAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      return new AudioContextClass();
    }
  } catch (error) {
    console.warn("AudioContext not supported:", error);
  }
  return null;
}

export function setupMediaSession(metadata: {
  title: string;
  artist: string;
  album?: string;
  artwork?: MediaImage[];
}): void {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album || "The Institutes Audio Learning",
      artwork: metadata.artwork || [
        {
          src: '/favicon.ico',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    });
  }
}

export function setMediaSessionHandlers(handlers: {
  play?: () => void;
  pause?: () => void;
  seekbackward?: () => void;
  seekforward?: () => void;
  previoustrack?: () => void;
  nexttrack?: () => void;
}): void {
  if ('mediaSession' in navigator) {
    Object.entries(handlers).forEach(([action, handler]) => {
      if (handler) {
        navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler);
      }
    });
  }
}

export function updateMediaSessionPosition(
  currentTime: number,
  duration: number,
  playbackRate: number = 1
): void {
  if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate,
      position: currentTime,
    });
  }
}

export function getAudioMimeType(): string {
  const audio = document.createElement('audio');
  
  if (audio.canPlayType('audio/mpeg')) {
    return 'audio/mpeg';
  } else if (audio.canPlayType('audio/mp4')) {
    return 'audio/mp4';
  } else if (audio.canPlayType('audio/ogg')) {
    return 'audio/ogg';
  }
  
  return 'audio/mpeg'; // fallback
}

export function preloadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    
    const handleCanPlay = () => {
      cleanup();
      resolve(audio);
    };
    
    const handleError = () => {
      cleanup();
      reject(new Error('Failed to load audio'));
    };
    
    const cleanup = () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    audio.src = src;
  });
}

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

export function isValidPlaybackSpeed(speed: number): speed is PlaybackSpeed {
  return PLAYBACK_SPEEDS.includes(speed as PlaybackSpeed);
}

export function getNextPlaybackSpeed(currentSpeed: PlaybackSpeed): PlaybackSpeed {
  const currentIndex = PLAYBACK_SPEEDS.indexOf(currentSpeed);
  const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
  return PLAYBACK_SPEEDS[nextIndex];
}

export function getPreviousPlaybackSpeed(currentSpeed: PlaybackSpeed): PlaybackSpeed {
  const currentIndex = PLAYBACK_SPEEDS.indexOf(currentSpeed);
  const prevIndex = currentIndex === 0 ? PLAYBACK_SPEEDS.length - 1 : currentIndex - 1;
  return PLAYBACK_SPEEDS[prevIndex];
}
