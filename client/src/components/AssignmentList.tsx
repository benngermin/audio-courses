import { Card, CardContent } from "@/components/ui/card";
import { Headphones, Clock, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Assignment, Chapter } from "@shared/schema";

interface AssignmentListProps {
  courseId: string;
  onAssignmentSelect: (assignment: Assignment) => void;
}

export function AssignmentList({ courseId, onAssignmentSelect }: AssignmentListProps) {
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", courseId, "assignments"],
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Assignments</h2>
          <p className="text-slate-600">Loading assignments...</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Assignments</h2>
          <p className="text-slate-600">No assignments available for this course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Assignments</h2>
        <p className="text-slate-600">Select an assignment to view available chapters</p>
      </div>
      
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            onClick={() => onAssignmentSelect(assignment)}
          />
        ))}
      </div>
    </div>
  );
}

interface AssignmentCardProps {
  assignment: Assignment;
  onClick: () => void;
}

function AssignmentCard({ assignment, onClick }: AssignmentCardProps) {
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignment.id, "chapters"],
  });

  const totalDuration = chapters.reduce((acc, chapter) => acc + (chapter.duration || 0), 0);
  const formattedDuration = formatDuration(totalDuration);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1 sm:mb-2 line-clamp-2">
              {assignment.title}
            </h3>
            {assignment.description && (
              <p className="text-slate-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                {assignment.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Headphones className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {chapters.length} Chapters
              </span>
              {totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {formattedDuration}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="text-slate-400 mt-1 sm:mt-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
