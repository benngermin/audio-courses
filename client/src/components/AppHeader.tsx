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
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50 h-20">
      <div className="w-full px-4 sm:px-6 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Course Name - Left (maintains size, truncates on smaller screens) */}
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-2xl font-medium text-foreground truncate leading-tight" style={{ lineHeight: '1.3' }}>
              {currentCourse ? (currentCourse.code ? `${currentCourse.code}: ${currentCourse.name}` : currentCourse.name) : "Audio Learning Platform"}
            </h1>
          </div>
          
          {/* Logo - Center (Fixed Position) */}
          <div className="flex-shrink-0 px-4">
            <img src={NewLogo} alt="The Institutes" className="w-12 h-12 object-contain" />
          </div>
          
          {/* Right side - Logout, Admin, Assignment Dropdown */}
          <div className="flex-1 flex justify-end items-center gap-2 pl-4">
            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-accent"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            {/* Admin Button - Only visible to admin users */}
            {user?.isAdmin && (
              <Button
                onClick={handleAdminNavigation}
                variant="outline"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted shadow-sm"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {location === "/admin" ? "Back to App" : "Admin"}
                </span>
              </Button>
            )}
            
            {/* Assignment Dropdown */}
            {assignments.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted min-w-0 shadow-sm"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-[200px]">
                      {currentAssignment?.title || "Select Assignment"}
                    </span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {assignments.map((assignment) => (
                    <DropdownMenuItem
                      key={assignment.id}
                      onClick={() => onAssignmentChange?.(assignment)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{assignment.title}</span>
                        {assignment.description && (
                          <span className="text-xs text-muted-foreground">
                            {assignment.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
