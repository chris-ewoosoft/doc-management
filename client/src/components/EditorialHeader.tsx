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
    try {
      await logout();
      window.location.replace("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-1 min-h-9">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1 hover:bg-secondary rounded-sm transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <h1
            className="text-lg font-bold text-foreground leading-none"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Documents
          </h1>
        </div>

        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-foreground leading-none">
              {user.name || user.email}
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-1.5 h-7 px-2 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
