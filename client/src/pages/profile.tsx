import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { LogOut, Settings, Download, Clock, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { UserProgress, DownloadedContent } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  const { data: downloads = [] } = useQuery<DownloadedContent[]>({
    queryKey: ["/api/downloads"],
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getTotalDownloadSize = () => {
    // Estimate average file size of 10MB per chapter
    return downloads.length * 10;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Loading profile...</p>
          </div>
        </main>
        <BottomNav currentPath={location} onNavigate={handleNavigation} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader />
      
      <main className="max-w-screen-xl mx-auto px-4">
        <div className="py-6 space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile</h2>
            <p className="text-slate-600">Manage your account and learning preferences</p>
          </div>

          {/* User Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.profileImageUrl || ""} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-800">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : "User"
                    }
                  </h3>
                  <p className="text-slate-600">{user.email}</p>
                  {user.isAdmin && (
                    <Badge variant="secondary" className="mt-2">
                      Administrator
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <Download className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">{downloads.length}</p>
                  <p className="text-sm text-slate-600">Downloads</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Award className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">0</p>
                  <p className="text-sm text-slate-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="font-medium text-slate-800">Offline Storage</h4>
                  <p className="text-sm text-slate-500">
                    {getTotalDownloadSize()}MB used by downloaded audio
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/downloads")}>
                  Manage
                </Button>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="font-medium text-slate-800">Playback Speed</h4>
                  <p className="text-sm text-slate-500">Default playback speed for audio</p>
                </div>
                <Badge variant="outline">1.0x</Badge>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="font-medium text-slate-800">Auto-advance</h4>
                  <p className="text-sm text-slate-500">Automatically play next chapter</p>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Learning Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Learning Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>Start listening to see your progress statistics</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin} />
    </div>
  );
}
