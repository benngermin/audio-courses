import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronDown, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadAlongViewer } from "@/components/ReadAlongViewer";
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
            "fixed inset-0 z-40",
            "bg-white dark:bg-gray-900",
            "flex flex-col overflow-hidden",
            "pb-20" // Add padding for miniplayer
          )}
        >


          {/* Read-Along Content - full screen with minimal padding */}
          <div className="flex-1 overflow-hidden pt-2 px-2 sm:px-4 lg:px-8">
              {currentChapter.hasReadAlong ? (
                <ReadAlongViewer
                  chapterId={currentChapter.id}
                  currentTime={audioState.currentTime}
                  isPlaying={isPlaying}
                  onSeek={handleSeek}
                  className={cn("h-full", textSize)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Read-along content is not available for this chapter.</p>
                </div>
              )}
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}