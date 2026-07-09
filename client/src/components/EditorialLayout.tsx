import { ReactNode, useState } from "react";
import EditorialHeader from "./EditorialHeader";
import EditorialSidebar from "./EditorialSidebar";

interface EditorialLayoutProps {
  children: ReactNode;
  fullScreen?: boolean;
}

export default function EditorialLayout({ children, fullScreen = false }: EditorialLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (fullScreen) {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <EditorialHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1 min-h-0">
          <EditorialSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden items-center justify-center">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EditorialHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        <EditorialSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-auto">
          <div className="editorial-layout">{children}</div>
        </main>
      </div>
    </div>
  );
}
