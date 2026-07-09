import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import DocumentList from "@/components/DocumentList";
import EditorialLayout from "@/components/EditorialLayout";

export default function Documents() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // Get query params
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Fetch documents
  const { data: documents = [], isLoading, error, refetch } = trpc.documents.list.useQuery({
    projectCategory: selectedCategory,
    limit: 100,
  });

  // Delete mutation
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Filter by search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;

    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc: any) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const categories = ["Backend", "Frontend", "DevOps", "Design", "Product"];

  return (
    <EditorialLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Documents</h1>
              <p className="text-muted-foreground">
                Manage and review software documentation
              </p>
            </div>
            <Button
              onClick={() => navigate("/documents/new")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          </div>

          {/* Divider */}
          <div className="editorial-divider" />
        </div>

        {/* Search and filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1 rounded-sm text-sm font-medium transition-colors ${
                !selectedCategory
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-sm text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        {error ? (
          <div className="editorial-card text-center py-12">
            <p className="text-destructive mb-2">Failed to load documents</p>
            <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        ) : (
          <DocumentList
            documents={filteredDocuments}
            isLoading={isLoading}
            onDelete={(id) => deleteDoc.mutate({ id })}
          />
        )}
      </div>
    </EditorialLayout>
  );
}
