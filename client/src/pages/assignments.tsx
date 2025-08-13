import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AssignmentList } from "@/components/AssignmentList";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Course } from "@shared/schema";

export default function Assignments() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const currentCourse = courses[0]; // For now, use first course

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleAssignmentSelect = (assignment: any) => {
    navigate(`/chapters?assignment=${assignment.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-slate-600">Loading courses...</p>
          </div>
        </main>
        <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader currentCourse={currentCourse} />
      
      <main className="max-w-screen-xl mx-auto px-4">
        {currentCourse ? (
          <AssignmentList 
            courseId={currentCourse.id}
            onAssignmentSelect={handleAssignmentSelect}
          />
        ) : (
          <div className="py-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Courses Available</h2>
            <p className="text-slate-600">Contact your administrator to access course content.</p>
          </div>
        )}
      </main>

      <BottomNav currentPath={location} onNavigate={handleNavigation} isAdmin={user?.isAdmin} />
    </div>
  );
}
