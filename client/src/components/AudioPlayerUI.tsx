import { OptimizedMiniPlayer } from "@/components/OptimizedMiniPlayer";
import { ReadAlongPanel } from "@/components/ReadAlongPanel";
import { usePlaybackState } from "@/contexts/OptimizedAudioContext";
import { useLocation } from "wouter";

export function AudioPlayerUI() {
  const { isReadAlongVisible, setIsReadAlongVisible } = usePlaybackState();
  const [location] = useLocation();
  
  // Hide mini player when user is in admin section
  const isInAdmin = location.startsWith('/admin');

  return (
    <>
      {!isInAdmin && <OptimizedMiniPlayer />}
      {!isInAdmin && (
        <ReadAlongPanel 
          isVisible={isReadAlongVisible} 
          onClose={() => setIsReadAlongVisible(false)} 
        />
      )}
    </>
  );
}