import { OptimizedMiniPlayer } from "@/components/OptimizedMiniPlayer";
import { ReadAlongPanel } from "@/components/ReadAlongPanel";
import { usePlaybackState } from "@/contexts/OptimizedAudioContext";

export function AudioPlayerUI() {
  const { isReadAlongVisible, setIsReadAlongVisible } = usePlaybackState();

  return (
    <>
      <OptimizedMiniPlayer />
      <ReadAlongPanel 
        isVisible={isReadAlongVisible} 
        onClose={() => setIsReadAlongVisible(false)} 
      />
    </>
  );
}