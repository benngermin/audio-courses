import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  BookOpenCheck, 
  Volume2, 
  Eye, 
  EyeOff,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadAlongToggleProps {
  hasReadAlong: boolean;
  isReadAlongEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
  className?: string;
}

export function ReadAlongToggle({
  hasReadAlong,
  isReadAlongEnabled,
  onToggle,
  isLoading = false,
  className
}: ReadAlongToggleProps) {

  if (!hasReadAlong) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <EyeOff className="h-4 w-4" />
        <span>Read-along not available</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex rounded-lg border bg-background p-1">
        {/* Audio Only Mode */}
        <Button
          variant={!isReadAlongEnabled ? "default" : "ghost"}
          size="sm"
          onClick={() => onToggle(false)}
          disabled={isLoading}
          className={cn(
            "h-8 px-3 transition-all",
            !isReadAlongEnabled && "shadow-sm"
          )}
        >
          <Volume2 className="h-4 w-4 mr-1.5" />
          Audio Only
        </Button>

        {/* Read Along Mode */}
        <Button
          variant={isReadAlongEnabled ? "default" : "ghost"}
          size="sm"
          onClick={() => onToggle(true)}
          disabled={isLoading}
          className={cn(
            "h-8 px-3 transition-all",
            isReadAlongEnabled && "shadow-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          )}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1.5"></div>
              Loading...
            </>
          ) : (
            <>
              <BookOpenCheck className="h-4 w-4 mr-1.5" />
              Read Along
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-2 text-xs h-5",
                  isReadAlongEnabled 
                    ? "bg-blue-100 text-blue-700 border-blue-200" 
                    : "bg-slate-100 text-slate-600"
                )}
              >
                <Zap className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
            </>
          )}
        </Button>
      </div>

      {/* Status indicator */}
      {isReadAlongEnabled && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-full px-2 py-1">
          <Eye className="h-3 w-3" />
          <span>Active</span>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function ReadAlongToggleCompact({
  hasReadAlong,
  isReadAlongEnabled,
  onToggle,
  isLoading = false,
  className
}: ReadAlongToggleProps) {
  
  if (!hasReadAlong) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn("h-8 px-2 text-muted-foreground", className)}
      >
        <EyeOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={isReadAlongEnabled ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!isReadAlongEnabled)}
      disabled={isLoading}
      className={cn(
        "h-8 px-2 transition-all",
        isReadAlongEnabled && "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
        className
      )}
      title={isReadAlongEnabled ? "Disable read-along" : "Enable read-along"}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : isReadAlongEnabled ? (
        <BookOpenCheck className="h-4 w-4" />
      ) : (
        <BookOpen className="h-4 w-4" />
      )}
    </Button>
  );
}