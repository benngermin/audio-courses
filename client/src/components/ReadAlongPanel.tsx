import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronDown, Type, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadAlongViewer } from "@/components/ReadAlongViewer";
import { ReadAlongControlBar } from "@/components/ReadAlongControlBar";
import { useCurrentTrack, usePlaybackState, useAudioState, useAudioControls } from "@/contexts/OptimizedAudioContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReadAlongPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const textSizes = [
  { label: "Small", value: "text-sm" },
  { label: "Medium", value: "text-base" },
  { label: "Large", value: "text-lg" },
  { label: "Extra Large", value: "text-xl" },
];

export function ReadAlongPanel({ isVisible, onClose }: ReadAlongPanelProps) {
  const { currentChapter, currentAssignment } = useCurrentTrack();
  const { isPlaying } = usePlaybackState();
  const { audioState } = useAudioState();
  const { audioControls } = useAudioControls();
  const [textSize, setTextSize] = useState("text-base");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isVisible, onClose]);

  // Removed drag gestures for full-screen mode

  const handleSeek = (time: number) => {
    if (audioControls?.seek) {
      audioControls.seek(time);
    }
  };

  const handleTogglePlay = () => {
    if (audioControls?.togglePlay) {
      audioControls.togglePlay();
    }
  };

  const handleSkipBackward = () => {
    if (audioControls?.skipBackward) {
      audioControls.skipBackward(15);
    }
  };

  const handleSkipForward = () => {
    if (audioControls?.skipForward) {
      audioControls.skipForward(30);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (audioControls?.changePlaybackRate) {
      audioControls.changePlaybackRate(speed);
    }
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    // Future implementation for grid/list view
  };

  if (!currentChapter) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed inset-0 z-50",
            "bg-white dark:bg-gray-900",
            "flex flex-col overflow-hidden"
          )}
        >
          {/* Minimal Header with Close Button */}
          <div className="flex-shrink-0 flex justify-end p-4 absolute top-0 right-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 rounded-full shadow-md"
              title="Close (ESC)"
              data-testid="button-close-read-along"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Read-Along Content */}
          <div className="flex-1 overflow-hidden pb-20">
            {currentChapter.hasReadAlong ? (
              <ReadAlongViewer
                chapterId={currentChapter.id}
                currentTime={audioState.currentTime}
                isPlaying={isPlaying}
                onSeek={handleSeek}
                className={cn("h-full pt-16", textSize)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Read-along content is not available for this chapter.</p>
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <ReadAlongControlBar
            currentTime={audioState.currentTime}
            duration={audioState.duration}
            isPlaying={isPlaying}
            playbackRate={audioState.playbackRate}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onSkipBackward={handleSkipBackward}
            onSkipForward={handleSkipForward}
            onSpeedChange={handleSpeedChange}
            onViewModeChange={handleViewModeChange}
            viewMode={viewMode}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}