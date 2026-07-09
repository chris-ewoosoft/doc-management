import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EditorFileNote } from "@/lib/documentLocales";
import FileNoteMarkers from "./FileNoteMarkers";

interface FileOverlayAnnotatorProps {
  embeddedId: string;
  fileName: string;
  pageLabel?: "Page" | "Slide";
  notes: EditorFileNote[];
  activeNoteId: number | null;
  onNoteClick: (id: number) => void;
  onDismiss?: () => void;
  onAddNote: (input: {
    pageNumber: number;
    xPercent: number;
    yPercent: number;
    content: string;
  }) => Promise<void>;
  onUpdateNote: (noteId: number, content: string) => Promise<void>;
  children: ReactNode | ((pageNumber: number) => ReactNode);
}

function positionFromEvent(event: React.MouseEvent<HTMLElement>, pageNumber: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    pageNumber,
    xPercent: ((event.clientX - rect.left) / rect.width) * 100,
    yPercent: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

export default function FileOverlayAnnotator({
  embeddedId,
  fileName,
  pageLabel = "Page",
  notes,
  activeNoteId,
  onNoteClick,
  onDismiss,
  onAddNote,
  onUpdateNote,
  children,
}: FileOverlayAnnotatorProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{
    pageNumber: number;
    xPercent: number;
    yPercent: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileNotes = notes.filter((n) => n.embeddedId === embeddedId);
  const pageNotes = fileNotes.filter((n) => n.pageNumber === pageNumber);
  const nextNoteNumber = fileNotes.length + 1;

  const viewer = typeof children === "function" ? children(pageNumber) : children;

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (pending) return;
    onDismiss?.();
    setPending(positionFromEvent(event, pageNumber));
    setDraft("");
  };

  const handleOverlayClick = () => {
    if (pending) return;
    onDismiss?.();
  };

  const submitNote = async () => {
    if (!pending || !draft.trim()) return;
    setIsSaving(true);
    try {
      await onAddNote({
        pageNumber: pending.pageNumber,
        xPercent: pending.xPercent,
        yPercent: pending.yPercent,
        content: draft.trim(),
      });
      setPending(null);
      setDraft("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="embedded-file-viewer">
      <div className="embedded-file-toolbar">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{pageLabel}</span>
          <Input
            type="number"
            min={1}
            value={pageNumber}
            onChange={(e) => setPageNumber(Math.max(1, Number(e.target.value) || 1))}
            className="h-7 w-16 text-xs"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">
          Right-click to add note · Left-click marker to view/edit
        </span>
      </div>

      <div className="embedded-file-overlay-host">
        <div className="embedded-file-overlay-content">{viewer}</div>
        <div
          className="embedded-file-overlay-layer pdf-annotate-overlay"
          onContextMenu={handleContextMenu}
          onClick={handleOverlayClick}
        >
          <FileNoteMarkers
            notes={pageNotes}
            activeNoteId={activeNoteId}
            pageLabel={pageLabel}
            onNoteClick={onNoteClick}
            onDismiss={onDismiss}
            onUpdateNote={onUpdateNote}
            pending={pending ? { ...pending, noteNumber: nextNoteNumber } : null}
          />
        </div>
      </div>

      {pending && (
        <div className="embedded-file-note-form">
          <p className="text-xs font-medium text-muted-foreground">
            New note #{nextNoteNumber} on {fileName} — {pageLabel.toLowerCase()} {pending.pageNumber}
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write note content..."
            className="min-h-14 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitNote} disabled={!draft.trim() || isSaving}>
              {isSaving ? "Saving..." : "Add note"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPending(null);
                setDraft("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
