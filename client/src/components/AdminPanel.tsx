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

export function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [adminSetupInfo, setAdminSetupInfo] = useState<any>(null);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: syncStatus } = useQuery<SyncLog>({
    queryKey: ["/api/admin/sync-status"],
  });

  // Fetch admin setup info
  useEffect(() => {
    apiRequest("GET", "/api/admin/setup-info")
      .then(setAdminSetupInfo)
      .catch(console.error);
  }, []);

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
                Last synced: {formatSyncTime(syncStatus.syncedAt)}
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

  const uploadAudioMutation = useMutation({
    mutationFn: async ({ chapterId, audioUrl, duration }: any) => {
      return await apiRequest("POST", `/api/admin/chapters/${chapterId}/upload-audio`, {
        audioUrl,
        duration
      });
    },
    onSuccess: () => {
      toast({
        title: "Audio uploaded",
        description: "Chapter audio has been successfully uploaded",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
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
            {course.description && (
              <p className="text-sm text-slate-600">{course.description}</p>
            )}
            <Badge variant="outline">Course ID: {course.id.slice(0, 8)}</Badge>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t bg-gray-50 p-4">
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments found for this course.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <AssignmentItem 
                  key={assignment.id} 
                  assignment={assignment}
                  onUploadAudio={uploadAudioMutation.mutate}
                  isUploading={uploadAudioMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AssignmentItemProps {
  assignment: Assignment;
  onUploadAudio: (data: any) => void;
  isUploading: boolean;
}

function AssignmentItem({ assignment, onUploadAudio, isUploading }: AssignmentItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/assignments", assignment.id, "chapters"],
    enabled: expanded,
  });

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
        <Badge variant="secondary" className="text-xs">
          {chapters.length} chapters
        </Badge>
      </div>
      
      {expanded && chapters.length > 0 && (
        <div className="mt-3 space-y-2 pl-5">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{chapter.title}</p>
                <p className="text-xs text-slate-500">
                  {chapter.audioUrl ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="h-3 w-3" />
                      Audio uploaded
                    </span>
                  ) : (
                    <span className="text-amber-600">No audio</span>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant={chapter.audioUrl ? "outline" : "default"}
                onClick={() => {
                  // Simulating audio upload from content repo
                  const mockAudioUrl = `https://content.theinstitutes.org/audio/${chapter.id}.mp3`;
                  onUploadAudio({
                    chapterId: chapter.id,
                    audioUrl: mockAudioUrl,
                    duration: Math.floor(Math.random() * 600) + 60 // Random duration between 1-10 minutes
                  });
                }}
                disabled={isUploading}
                className="text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                {chapter.audioUrl ? 'Re-upload' : 'Upload'} Audio
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
