import { useCallback, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { getNextNoteNumber, type EditorFileNote } from "@/lib/documentLocales";
import FileNoteMarkers, { type NotePosition } from "./FileNoteMarkers";

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
  onDeleteNote: (noteId: number) => Promise<void>;
  onMoveNote: (noteId: number, position: NotePosition) => Promise<void>;
  children: ReactNode | ((pageNumber: number) => ReactNode);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
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
  onDeleteNote,
  onMoveNote,
  children,
}: FileOverlayAnnotatorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pending, setPending] = useState<{
    pageNumber: number;
    xPercent: number;
    yPercent: number;
  } | null>(null);

  const fileNotes = notes.filter((n) => n.embeddedId === embeddedId);
  const pageNotes = fileNotes.filter((n) => n.pageNumber === pageNumber);
  const nextNoteNumber = getNextNoteNumber(fileNotes);

  const viewer = typeof children === "function" ? children(pageNumber) : children;

  const resolvePosition = useCallback((clientX: number, clientY: number): NotePosition => {
    const overlay = overlayRef.current;
    if (!overlay) return { xPercent: 0, yPercent: 0 };
    const rect = overlay.getBoundingClientRect();
    return {
      xPercent: clampPercent(((clientX - rect.left) / rect.width) * 100),
      yPercent: clampPercent(((clientY - rect.top) / rect.height) * 100),
    };
  }, []);

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (pending) return;
    onDismiss?.();
    setPending(positionFromEvent(event, pageNumber));
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (pending) return;
    if ((event.target as HTMLElement).closest(".file-note-marker, .file-note-popover")) return;
    onDismiss?.();
  };

  const submitPendingNote = async (content: string) => {
    if (!pending) return;
    await onAddNote({
      pageNumber: pending.pageNumber,
      xPercent: pending.xPercent,
      yPercent: pending.yPercent,
      content,
    });
    setPending(null);
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
          Left-drag to move · Right-click to add or edit note
        </span>
      </div>

      <div className="embedded-file-overlay-host">
        <div className="embedded-file-overlay-content">{viewer}</div>
        <div
          ref={overlayRef}
          className="embedded-file-overlay-layer pdf-annotate-overlay"
          onContextMenu={handleContextMenu}
          onClick={handleOverlayClick}
        >
          <FileNoteMarkers
            notes={pageNotes}
            activeNoteId={activeNoteId}
            pageLabel={pageLabel}
            resolvePosition={resolvePosition}
            onNoteClick={onNoteClick}
            onDismiss={onDismiss}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onMoveNote={onMoveNote}
            pending={
              pending
                ? { ...pending, noteNumber: nextNoteNumber, pageNumber: pending.pageNumber }
                : null
            }
            onSubmitPending={submitPendingNote}
            onCancelPending={() => setPending(null)}
          />
        </div>
      </div>
    </div>
  );
}
