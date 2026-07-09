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
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>();

  const params = new URLSearchParams(window.location.search);
  const groupParam = params.get("group");

  const { data: groups = [] } = trpc.groups.list.useQuery();

  useEffect(() => {
    if (groupParam) {
      const id = Number(groupParam);
      if (!Number.isNaN(id)) setSelectedGroupId(id);
    }
  }, [groupParam]);

  const { data: documents = [], isLoading, error, refetch } = trpc.documents.list.useQuery({
    groupId: selectedGroupId,
    limit: 100,
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;

    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc: { title: string; description?: string | null }) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  return (
    <EditorialLayout>
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Documents</h1>
              <p className="text-muted-foreground">
                Manage and review software documentation
              </p>
            </div>
            <Button onClick={() => navigate("/documents/new")} className="gap-2">
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          </div>

          <div className="editorial-divider" />
        </div>

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

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGroupId(undefined)}
              className={`px-3 py-1 rounded-sm text-sm font-medium transition-colors ${
                !selectedGroupId
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`px-3 py-1 rounded-sm text-sm font-medium transition-colors ${
                  selectedGroupId === group.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>

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
