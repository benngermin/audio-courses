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
import { ManualContentUpload } from "./ManualContentUpload";

export function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: syncStatus } = useQuery<SyncLog>({
    queryKey: ["/api/admin/sync-status"],
  });

  // Fetch admin setup info
  const { data: adminSetupInfo } = useQuery<any>({
    queryKey: ["/api/admin/setup-info"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/sync");
    },
    onSuccess: () => {
      toast({
        title: "Content Sync Started",
        description: "Syncing course audio from content repository API",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatSyncTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours} hours ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minutes ago`;
    } else {
      return "Just now";
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 text-green-600";
      case "error":
        return "bg-red-50 text-red-600";
      case "in_progress":
        return "bg-blue-50 text-blue-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Dashboard</h2>
        <p className="text-slate-600">Manage course content and upload audio from the content repository API</p>
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

      {/* Content Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <span>Content Repository Sync</span>
            </div>
            {syncStatus && (
              <Badge className={getSyncStatusColor(syncStatus.status)}>
                Last synced: {syncStatus.syncedAt ? formatSyncTime(syncStatus.syncedAt.toString()) : 'Never'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Upload and sync course audio content from The Institutes content repository API. 
            This will import courses, assignments, and audio chapters.
          </p>
          {syncStatus?.message && (
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-700">{syncStatus.message}</p>
            </div>
          )}
          <div className="flex gap-4">
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || syncStatus?.status === "in_progress"}
              className="flex items-center gap-2"
            >
              {syncMutation.isPending || syncStatus?.status === "in_progress" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {syncMutation.isPending || syncStatus?.status === "in_progress" ? "Syncing..." : "Sync Content"}
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              View Sync History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Course Audio Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              <span>Course Audio Management</span>
            </div>
            <Badge variant="outline">
              {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Browse courses and upload audio content for each chapter. Audio files are synced from the content repository.
          </p>
          {coursesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No courses available</AlertTitle>
              <AlertDescription>
                Click "Sync Content" above to import courses from the content repository API.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <CourseItem 
                  key={course.id} 
                  course={course}
                  expanded={expandedCourse === course.id}
                  onToggle={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Content Upload Section */}
      <ManualContentUpload />
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
