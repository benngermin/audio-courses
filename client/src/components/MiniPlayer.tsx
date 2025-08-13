import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Expand } from "lucide-react";
import type { Assignment, Chapter } from "@shared/schema";

interface MiniPlayerProps {
  assignment: Assignment;
  chapter: Chapter;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
  className?: string;
}

export function MiniPlayer({
  assignment,
  chapter,
  isPlaying,
  onTogglePlay,
  onExpand,
  className = "",
}: MiniPlayerProps) {
  return (
    <Card className={`fixed bottom-4 left-4 right-4 bg-white shadow-lg border border-gray-200 z-40 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={onTogglePlay}
            className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-800 truncate">
              {chapter.title}
            </h4>
            <p className="text-sm text-slate-500 truncate">
              {assignment.title}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpand}
            className="p-2 text-slate-600 flex-shrink-0"
          >
            <Expand className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
