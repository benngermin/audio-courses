import { useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Course, Assignment } from "@shared/schema";
import TILogo from "@/assets/ti-logo.svg";

interface AppHeaderProps {
  currentCourse?: Course;
  currentAssignment?: Assignment;
  onAssignmentChange?: (assignment: Assignment) => void;
}

export function AppHeader({ currentCourse, currentAssignment, onAssignmentChange }: AppHeaderProps) {
  const { user } = useAuth();
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", currentCourse?.id, "assignments"],
    enabled: !!currentCourse?.id,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50 h-20">
      <div className="max-w-screen-xl mx-auto px-4 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Course Name - Left */}
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold text-slate-800 truncate" style={{ fontFamily: '"Open Sans", sans-serif' }}>
              {currentCourse ? (currentCourse.code ? `${currentCourse.code}: ${currentCourse.name}` : currentCourse.name) : "Audio Learning Platform"}
            </h1>
          </div>
          
          {/* Logo - Center */}
          <div className="flex-shrink-0 px-4">
            <img src={TILogo} alt="TI Logo" className="w-10 h-10 text-primary" />
          </div>
          
          {/* Assignment Dropdown and User Menu - Right */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {assignments.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <span className="truncate max-w-48">
                      {currentAssignment?.title || "Select Assignment"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
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
