import { useState, type ReactNode } from "react";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EditorFileNote } from "@/lib/documentLocales";
import FileNoteMarkers from "./FileNoteMarkers";
import FileNotesList from "./FileNotesList";

interface FileOverlayAnnotatorProps {
  embeddedId: string;
  fileName: string;
  pageLabel?: "Page" | "Slide";
  notes: EditorFileNote[];
  annotateMode: boolean;
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

export default function FileOverlayAnnotator({
  embeddedId,
  fileName,
  pageLabel = "Page",
  notes,
  annotateMode,
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

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!annotateMode || pending) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    setPending({ pageNumber, xPercent, yPercent });
    setDraft("");
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

  const showMarkerLayer = annotateMode || pageNotes.length > 0;

  const handleListNoteClick = (note: EditorFileNote) => {
    if (activeNoteId === note.id) {
      onDismiss?.();
      return;
    }
    setPageNumber(note.pageNumber);
    onNoteClick(note.id);
  };

  const handleMarkerClick = (id: number) => {
    if (activeNoteId === id) {
      onDismiss?.();
      return;
    }
    onNoteClick(id);
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
        {annotateMode ? (
          <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <NotebookPen className="w-3.5 h-3.5" />
            Click on {pageLabel.toLowerCase()} to place note #{nextNoteNumber}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Native viewer — best text quality</span>
        )}
      </div>

      <div className="embedded-file-overlay-host">
        <div className="embedded-file-overlay-content">{viewer}</div>
        {showMarkerLayer && (
          <div
            className={`embedded-file-overlay-layer ${annotateMode ? "" : "pointer-events-none"}`}
            onClick={annotateMode ? handleOverlayClick : undefined}
          >
            <FileNoteMarkers
              notes={pageNotes}
              activeNoteId={activeNoteId}
              pageLabel={pageLabel}
              onNoteClick={handleMarkerClick}
              onDismiss={onDismiss}
              pending={
                pending
                  ? { ...pending, noteNumber: nextNoteNumber }
                  : null
              }
            />
          </div>
        )}
      </div>

      {pending && (
        <div className="embedded-file-note-form">
          <p className="text-xs font-medium text-muted-foreground">
            Note #{nextNoteNumber} on {fileName} — {pageLabel.toLowerCase()} {pending.pageNumber}
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write note..."
            className="min-h-14 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitNote} disabled={!draft.trim() || isSaving}>
              {isSaving ? "Saving..." : "Add note"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <FileNotesList
        notes={fileNotes}
        activeNoteId={activeNoteId}
        pageLabel={pageLabel}
        onNoteClick={handleListNoteClick}
        onDismiss={onDismiss}
        onUpdateNote={onUpdateNote}
      />
    </div>
  );
}
