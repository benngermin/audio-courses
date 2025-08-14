import { useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Course, Assignment } from "@shared/schema";
import NewLogo from "@/assets/new-logo.png";

interface AppHeaderProps {
  currentCourse?: Course;
  currentAssignment?: Assignment;
  onAssignmentChange?: (assignment: Assignment) => void;
}

export function AppHeader({ currentCourse, currentAssignment, onAssignmentChange }: AppHeaderProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", currentCourse?.id, "assignments"],
    enabled: !!currentCourse?.id,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleAdminNavigation = () => {
    if (location === "/admin") {
      navigate("/assignments");
    } else {
      navigate("/admin");
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50 h-16 sm:h-20">
      <div className="w-full px-3 sm:px-6 h-full flex items-center">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          {/* Course Code - Left (shows only code on mobile, full name on desktop) */}
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-2xl font-medium text-foreground whitespace-nowrap">
              {/* On mobile: show only course code */}
              <span className="sm:hidden">
                {currentCourse?.code || ""}
              </span>
              {/* On desktop: show full course name */}
              <span className="hidden sm:inline">
                {currentCourse ? (currentCourse.code ? `${currentCourse.code}: ${currentCourse.name}` : currentCourse.name) : ""}
              </span>
            </h1>
          </div>
          
          {/* Logo - Center */}
          <div className="flex-shrink-0 px-2 sm:px-4">
            <img src={NewLogo} alt="The Institutes" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          </div>
          
          {/* Right side - Assignment Dropdown and Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Assignment Dropdown - More compact on mobile */}
            {assignments.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted shadow-sm"
                  >
                    <span className="truncate max-w-[80px] sm:max-w-[150px] lg:max-w-[200px]">
                      {currentAssignment?.title || "Select"}
                    </span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-64 max-h-[60vh] overflow-y-auto">
                  {assignments.map((assignment) => (
                    <DropdownMenuItem
                      key={assignment.id}
                      onClick={() => onAssignmentChange?.(assignment)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{assignment.title}</span>
                        {assignment.description && (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {assignment.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Admin Button - Only visible to admin users, icon only on mobile */}
            {user?.isAdmin && (
              <Button
                onClick={handleAdminNavigation}
                variant="outline"
                className="flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted shadow-sm"
                title={location === "/admin" ? "Back to App" : "Admin Settings"}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {location === "/admin" ? "Back to App" : "Admin"}
                </span>
              </Button>
            )}
            
            {/* Logout Button - Icon only */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-accent"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
