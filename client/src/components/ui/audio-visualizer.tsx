import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({ isPlaying, className }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bars = container.querySelectorAll('.visualizer-bar');
    
    if (isPlaying) {
      bars.forEach((bar, index) => {
        const element = bar as HTMLElement;
        element.style.animationDelay = `${index * 0.1}s`;
        element.style.animationPlayState = 'running';
      });
    } else {
      bars.forEach((bar) => {
        const element = bar as HTMLElement;
        element.style.animationPlayState = 'paused';
      });
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className={cn("flex items-end justify-center gap-1 h-32", className)}
    >
      {Array.from({ length: 15 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "visualizer-bar bg-primary w-1 rounded-full transition-all duration-300",
            "animate-[wave_1.5s_ease-in-out_infinite]"
          )}
          style={{
            height: `${20 + Math.random() * 60}%`,
            animationDelay: `${i * 0.1}s`,
            animationPlayState: isPlaying ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  );
}
