import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderSync, 
  History, 
  Plus, 
  Edit, 
  Trash, 
  RefreshCw 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Course, SyncLog } from "@shared/schema";

export function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: syncStatus } = useQuery<SyncLog>({
    queryKey: ["/api/admin/sync-status"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/sync");
    },
    onSuccess: () => {
      toast({
        title: "FolderSync started",
        description: "Content sync from Bubble repository has started",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    },
    onError: (error) => {
      toast({
        title: "FolderSync failed",
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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Panel</h2>
        <p className="text-slate-600">Manage courses and sync content from Bubble repository</p>
      </div>

      {/* FolderSync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Content FolderSync</span>
            {syncStatus && (
              <Badge className={getSyncStatusColor(syncStatus.status)}>
                Last synced: {formatSyncTime(syncStatus.syncedAt)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncStatus?.message && (
            <p className="text-sm text-slate-600 mb-4">{syncStatus.message}</p>
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
                <FolderSync className="h-4 w-4" />
              )}
              {syncMutation.isPending || syncStatus?.status === "in_progress" ? "Syncing..." : "FolderSync Now"}
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              View Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Course Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Course Management</span>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Course
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No courses found. FolderSync content from Bubble repository to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <CourseItem key={course.id} course={course} />
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
}

function CourseItem({ course }: CourseItemProps) {
  const { data: assignments = [] } = useQuery({
    queryKey: ["/api/courses", course.id, "assignments"],
  });

  const totalChapters = assignments.reduce((acc, assignment) => {
    // Would need to fetch chapters for each assignment to get accurate count
    return acc + 5; // Placeholder
  }, 0);

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div>
        <h4 className="font-medium text-slate-800">{course.name}</h4>
        <p className="text-sm text-slate-500">
          {assignments.length} assignments • {totalChapters} chapters
        </p>
        {course.description && (
          <p className="text-sm text-slate-600 mt-1">{course.description}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="p-2">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="p-2 text-red-600 hover:text-red-800">
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
