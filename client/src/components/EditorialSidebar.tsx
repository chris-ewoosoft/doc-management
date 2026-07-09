import { FileText, Home, Settings, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

interface EditorialSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function EditorialSidebar({ isOpen = true, onClose }: EditorialSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: groups = [] } = trpc.groups.list.useQuery();

  const navItems = [
    { icon: Home, label: "Dashboard", href: "/documents" },
    { icon: FileText, label: "All Documents", href: "/documents" },
    { icon: Plus, label: "New Document", href: "/documents/new" },
  ];

  const linkClassName =
    "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors";

  const categoryLinkClassName =
    "flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 lg:hidden z-30"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-out lg:transform-none z-40 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 space-y-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <nav className="space-y-2">
            <p className="text-xs font-semibold text-sidebar-muted-foreground tracking-widest px-3 py-2 uppercase">
              Navigation
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={linkClassName}
                onClick={onClose}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="space-y-2">
            <p className="text-xs font-semibold text-sidebar-muted-foreground tracking-widest px-3 py-2 uppercase">
              Groups
            </p>
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/documents?group=${group.id}`}
                className={categoryLinkClassName}
                onClick={onClose}
              >
                <span className="w-2 h-2 rounded-full bg-sidebar-primary" />
                {group.name}
              </Link>
            ))}
          </nav>

          <div className="h-px bg-sidebar-border" />

          <nav className="space-y-2">
            <Link href="/settings" className={linkClassName} onClick={onClose}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}
