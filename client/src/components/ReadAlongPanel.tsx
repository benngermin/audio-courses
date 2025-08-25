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

  // Calculate panel height based on viewport (accounting for mini player height)
  const panelHeight = "calc(100vh - 80px - env(safe-area-inset-bottom) - env(safe-area-inset-top))";
  const minHeight = "300px";

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

  // Handle drag gestures
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  const handleSeek = (time: number) => {
    if (audioControls?.seek) {
      audioControls.seek(time);
    }
  };

  if (!currentChapter) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-30"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Read-Along Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={panelRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{
              height: panelHeight,
              minHeight: minHeight,
              bottom: "calc(80px + env(safe-area-inset-bottom))",
            }}
            className={cn(
              "fixed left-0 right-0 z-40",
              "bg-white dark:bg-gray-900",
              "rounded-t-[20px] shadow-2xl",
              "flex flex-col overflow-hidden"
            )}
          >
            {/* Panel Header with drag handle */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
              {/* Drag handle */}
              <div className="w-full py-2 flex justify-center">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Header controls */}
              <div className="flex items-center justify-between px-4 pb-3">
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
                  >
                    <ChevronDown className="h-4 w-4" />
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
    </>
  );
}