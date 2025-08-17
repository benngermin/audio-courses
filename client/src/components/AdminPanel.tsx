import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FolderSync, 
  History, 
  Plus, 
  Edit, 
  Trash, 
  RefreshCw,
  Upload,
  Music,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Course, SyncLog, Assignment, Chapter } from "@shared/schema";
import { UnifiedContentManager } from "./UnifiedContentManager";

export function AdminPanel() {
  const { toast } = useToast();
  
  // Fetch admin setup info
  const { data: adminSetupInfo } = useQuery<any>({
    queryKey: ["/api/admin/setup-info"],
  });

  return (
    <div className="py-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Dashboard</h2>
        <p className="text-slate-600">Manage all course content in one unified interface</p>
      </div>

      {/* Admin Setup Info */}
      {adminSetupInfo && !adminSetupInfo.isAdmin && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Admin Access Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>You need admin privileges to manage course content. To grant yourself admin access:</p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Open the terminal in your development environment</li>
              <li>Run this command: <code className="bg-amber-100 px-2 py-1 rounded text-sm">{adminSetupInfo?.setupCommand}</code></li>
              <li>Refresh this page after running the command</li>
            </ol>
            <p className="text-sm mt-2">Your User ID: <strong>{adminSetupInfo?.userId}</strong></p>
          </AlertDescription>
        </Alert>
      )}

      {/* Unified Content Manager */}
      <UnifiedContentManager />
    </div>
  );
}

interface CourseItemProps {
  course: Course;
  expanded: boolean;
  onToggle: () => void;
}

function CourseItem({ course, expanded, onToggle }: CourseItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", course.id, "assignments"],
  });

  const uploadCourseAudioMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/admin/courses/${course.id}/upload-audio`, {
        baseAudioUrl: null // Will use default content repo URL
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Course Audio Uploaded",
        description: `Successfully uploaded audio for ${data.updatedCount} chapters`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments", course.id] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div>
              <h4 className="font-medium text-slate-800">{course.name}</h4>
              <p className="text-sm text-slate-500">
                {assignments.length} assignments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                uploadCourseAudioMutation.mutate();
              }}
              disabled={uploadCourseAudioMutation.isPending}
              size="sm"
              className="flex items-center gap-2"
            >
              {uploadCourseAudioMutation.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Upload Course Audio
            </Button>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t bg-gray-50 p-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Course Audio Management:</strong> Click "Upload Course Audio" to sync all chapter audio files from the content repository for this entire course.
            </p>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments found for this course.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <AssignmentPreview 
                  key={assignment.id} 
                  assignment={assignment}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AssignmentPreviewProps {
  assignment: Assignment;
}

function AssignmentPreview({ assignment }: AssignmentPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignment.id, "chapters"],
    enabled: expanded,
  });

  const uploadedChapters = chapters.filter((ch) => ch.audioUrl).length;

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <h5 className="font-medium text-sm">{assignment.name}</h5>
        </div>
        <div className="flex items-center gap-2">
          {uploadedChapters > 0 && (
            <Badge variant={uploadedChapters === chapters.length ? "default" : "secondary"} className="text-xs">
              {uploadedChapters === chapters.length ? (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Complete
                </span>
              ) : (
                `${uploadedChapters}/${chapters.length}`
              )}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {chapters.length} chapters
          </Badge>
        </div>
      </div>
      
      {expanded && chapters.length > 0 && (
        <div className="mt-3 space-y-1 pl-5">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center gap-2 py-1 text-xs">
              {chapter.audioUrl ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <AlertCircle className="h-3 w-3 text-amber-600" />
              )}
              <span className={chapter.audioUrl ? "text-slate-700" : "text-slate-500"}>
                {chapter.title}
              </span>
              {chapter.audioUrl && (
                <span className="text-green-600 ml-auto">Audio ready</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
