import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Play, Trash2, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { DownloadedContent, Chapter } from "@shared/schema";

export default function Downloads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();

  const { data: downloads = [], isLoading } = useQuery<DownloadedContent[]>({
    queryKey: ["/api/downloads"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      return await apiRequest("DELETE", `/api/downloads/${chapterId}`);
    },
    onSuccess: () => {
      toast({
        title: "Download removed",
        description: "Audio file has been deleted from your device",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/downloads"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove download",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handlePlay = (download: DownloadedContent) => {
    // Navigate to player with the downloaded chapter
    navigate(`/player?chapter=${download.chapterId}`);
  };

  const handleDelete = (chapterId: string) => {
    deleteMutation.mutate(chapterId);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader />
      
      <main className="max-w-screen-xl mx-auto px-4">
        <div className="py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Downloaded Content</h2>
            <p className="text-slate-600">Audio files available for offline listening</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : downloads.length === 0 ? (
            <div className="text-center py-12">
              <Download className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Downloads Yet</h3>
              <p className="text-slate-600 mb-6">
                Download chapters from the course content to listen offline
              </p>
              <Button onClick={() => navigate("/assignments")}>
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {downloads.map((download) => (
                <DownloadCard
                  key={download.id}
                  download={download}
                  onPlay={() => handlePlay(download)}
                  onDelete={() => handleDelete(download.chapterId)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin} />
    </div>
  );
}

interface DownloadCardProps {
  download: DownloadedContent;
  onPlay: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function DownloadCard({ download, onPlay, onDelete, isDeleting }: DownloadCardProps) {
  const { data: chapter } = useQuery<Chapter>({
    queryKey: ["/api/chapters", download.chapterId],
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (!chapter) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <p className="text-slate-500">Loading chapter information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">
                {chapter.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Downloaded {formatDate(download.downloadedAt)}</span>
                {chapter.duration && (
                  <>
                    <span>•</span>
                    <span>{Math.floor(chapter.duration / 60)}:{(chapter.duration % 60).toString().padStart(2, '0')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPlay}
              className="p-2 text-primary hover:text-primary-dark"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
