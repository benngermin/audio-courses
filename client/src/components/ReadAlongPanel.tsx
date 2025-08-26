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
            "fixed inset-0 z-50",
            "bg-white dark:bg-gray-900",
            "flex flex-col overflow-hidden"
          )}
        >
          {/* Full-Screen Header */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-4">
                {/* Chapter info */}
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {currentAssignment?.title}
                  </h3>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {currentChapter.title}
                  </h2>
                </div>

                {/* Control buttons */}
                <div className="flex items-center gap-2">
                  {/* Text size control */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {textSizes.map((size) => (
                        <DropdownMenuItem
                          key={size.value}
                          onClick={() => setTextSize(size.value)}
                        >
                          <span
                            className={cn(
                              "font-medium",
                              textSize === size.value && "text-orange-600"
                            )}
                          >
                            {size.label}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  title="Close (ESC)"
                >
                  <X className="h-4 w-4" />
                </Button>
                </div>
              </div>
            </div>

            {/* Read-Along Content */}
            <div className="flex-1 overflow-hidden">
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