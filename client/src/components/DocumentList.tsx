import { FileText, Trash2, Eye } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Document {
  id: number;
  title: string;
  description?: string | null;
  projectCategory: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number | { name?: string; email?: string };
  updatedBy?: number | { name?: string; email?: string };
}

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onDelete?: (id: number) => void;
}

export default function DocumentList({
  documents,
  isLoading = false,
  onDelete,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="editorial-card animate-pulse">
            <div className="h-6 bg-secondary rounded w-1/3 mb-2" />
            <div className="h-4 bg-secondary rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="editorial-card text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">No documents yet</p>
        <Link
          href="/documents/new"
          className="text-accent hover:underline font-medium"
        >
          Create your first document
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="editorial-card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link
                href={`/documents/${doc.id}`}
                className="block group-hover:text-accent transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                  {doc.title}
                </h3>
              </Link>

              {doc.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {doc.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs editorial-meta">
                <span className="inline-block px-2 py-1 bg-secondary rounded-sm">
                  {doc.projectCategory}
                </span>
                <span>
                  Updated {formatDistanceToNow(new Date(doc.updatedAt), { locale: vi, addSuffix: true })}
                </span>
                {typeof doc.updatedBy === "object" && doc.updatedBy?.name && (
                  <span>by {doc.updatedBy.name}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-2"
                title="View document"
              >
                <Link href={`/documents/${doc.id}`}>
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">View</span>
                </Link>
              </Button>

              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${doc.title}"?`)) {
                      onDelete(doc.id);
                    }
                  }}
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
