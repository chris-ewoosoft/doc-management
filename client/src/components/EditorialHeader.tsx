import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";

interface EditorialHeaderProps {
  onMenuClick?: () => void;
}

export default function EditorialHeader({ onMenuClick }: EditorialHeaderProps) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-secondary rounded-sm transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
              Documents
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">Editorial Management System</p>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-sm font-medium text-foreground">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Subtle divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </header>
  );
}
