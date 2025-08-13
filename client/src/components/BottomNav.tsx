import { Button } from "@/components/ui/button";
import { List, Download, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isAdmin?: boolean;
}

export function BottomNav({ currentPath, onNavigate, isAdmin }: BottomNavProps) {
  const navItems = [
    { path: "/assignments", icon: List, label: "Assignments" },
    { path: "/downloads", icon: Download, label: "Downloads" },
    { path: "/profile", icon: User, label: "Profile" },
    ...(isAdmin ? [{ path: "/admin", icon: Settings, label: "Admin" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 lg:hidden z-30">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Button
            key={path}
            variant="ghost"
            onClick={() => onNavigate(path)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 h-auto",
              currentPath === path
                ? "text-primary"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
