import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
