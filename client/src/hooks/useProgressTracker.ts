import { useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProgressUpdate {
  chapterId: string;
  currentTime: number;
  isCompleted: boolean;
}

interface UseProgressTrackerProps {
  chapterId: string;
  onError?: (error: Error) => void;
}

export function useProgressTracker({ chapterId, onError }: UseProgressTrackerProps) {
  const pendingUpdatesRef = useRef<Map<string, ProgressUpdate>>(new Map());
  const batchTimeoutRef = useRef<number>();
  const lastSentTimeRef = useRef<Map<string, number>>(new Map());
  const failedUpdatesRef = useRef<Map<string, { update: ProgressUpdate; retryCount: number }>>(new Map());

  const progressMutation = useMutation({
    mutationFn: async (updates: ProgressUpdate[]) => {
      // Send all updates in a single batch request
      const results = await Promise.allSettled(
        updates.map(update => 
          apiRequest("POST", "/api/progress", update)
        )
      );
      
      // Track failed updates for retry
      const failures = results
        .map((result, index) => ({ result, update: updates[index] }))
        .filter(({ result }) => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.warn(`${failures.length} progress updates failed, scheduling retries`);
        
        // Schedule retries for failed updates with exponential backoff
        failures.forEach(({ update }) => {
          const existing = failedUpdatesRef.current.get(update.chapterId);
          const retryCount = existing?.retryCount || 0;
          
          if (retryCount < 3) { // Max 3 retries
            failedUpdatesRef.current.set(update.chapterId, {
              update,
              retryCount: retryCount + 1
            });
            
            // Exponential backoff: 2^retryCount seconds
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => {
              const failedUpdate = failedUpdatesRef.current.get(update.chapterId);
              if (failedUpdate) {
                console.info(`Retrying progress update for ${update.chapterId} (attempt ${failedUpdate.retryCount})`);
                progressMutation.mutate([failedUpdate.update]);
                failedUpdatesRef.current.delete(update.chapterId);
              }
            }, delay);
          } else {
            console.error(`Progress update failed permanently for ${update.chapterId} after 3 retries`);
            failedUpdatesRef.current.delete(update.chapterId);
            onError?.(new Error(`Failed to save progress for chapter ${update.chapterId}`));
          }
        });
      } else {
        // Clear any successful updates from failed queue
        updates.forEach(update => {
          failedUpdatesRef.current.delete(update.chapterId);
        });
      }
      
      return results;
    },
    onError: (error: Error) => {
      console.error("Batch progress update failed:", error);
      onError?.(error);
    },
  });

  const flushPendingUpdates = useCallback(() => {
    const updates = Array.from(pendingUpdatesRef.current.values());
    if (updates.length === 0) return;

    // Clear pending updates before sending
    pendingUpdatesRef.current.clear();
    
    // Send batch update
    progressMutation.mutate(updates);
  }, [progressMutation]);

  const updateProgress = useCallback((currentTime: number, isCompleted: boolean = false) => {
    if (!chapterId) return;

    const now = Date.now();
    const lastSent = lastSentTimeRef.current.get(chapterId) || 0;
    
    // For completion updates, send immediately
    if (isCompleted) {
      const update: ProgressUpdate = { chapterId, currentTime, isCompleted };
      progressMutation.mutate([update]);
      lastSentTimeRef.current.set(chapterId, now);
      return;
    }

    // For regular updates, batch them
    // Only update if significant time has passed (10+ seconds) or significant progress (30+ seconds)
    const timeSinceLastSent = now - lastSent;
    const existingUpdate = pendingUpdatesRef.current.get(chapterId);
    const timeDifference = existingUpdate ? Math.abs(currentTime - existingUpdate.currentTime) : Infinity;
    
    if (timeSinceLastSent >= 10000 || timeDifference >= 30) {
      const update: ProgressUpdate = { chapterId, currentTime, isCompleted };
      pendingUpdatesRef.current.set(chapterId, update);

      // Clear existing timeout and set new one
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Batch updates every 5 seconds
      batchTimeoutRef.current = window.setTimeout(() => {
        flushPendingUpdates();
      }, 5000);
    }
  }, [chapterId, flushPendingUpdates, progressMutation]);

  // Flush any pending updates when component unmounts or chapter changes
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      // Flush any remaining updates immediately on cleanup
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }
    };
  }, [flushPendingUpdates]);

  // Flush updates when the page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingUpdatesRef.current.size > 0) {
        // Use sendBeacon for reliable delivery during page unload
        const updates = Array.from(pendingUpdatesRef.current.values());
        navigator.sendBeacon('/api/progress/batch', JSON.stringify(updates));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Flush updates when page becomes hidden (mobile app backgrounding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushPendingUpdates]);

  return {
    updateProgress,
    flushPendingUpdates,
    isPending: progressMutation.isPending,
  };
}