import { useRef, useState } from "react";
import type { EditorFileNote } from "@/lib/documentLocales";
import FileNotePopover from "./FileNotePopover";

export interface NotePosition {
  xPercent: number;
  yPercent: number;
}

interface PendingNote extends NotePosition {
  noteNumber: number;
  pageNumber: number;
}

interface FileNoteMarkersProps {
  notes: EditorFileNote[];
  activeNoteId: number | null;
  pageLabel?: string;
  resolvePosition: (clientX: number, clientY: number) => NotePosition;
  onNoteClick: (id: number) => void;
  onDismiss?: () => void;
  onUpdateNote?: (noteId: number, content: string) => Promise<void>;
  onDeleteNote?: (noteId: number) => Promise<void>;
  onMoveNote?: (noteId: number, position: NotePosition) => Promise<void>;
  pending?: PendingNote | null;
  onSubmitPending?: (content: string) => Promise<void>;
  onCancelPending?: () => void;
}

const DRAG_THRESHOLD_PX = 4;

export default function FileNoteMarkers({
  notes,
  activeNoteId,
  pageLabel = "Page",
  resolvePosition,
  onNoteClick,
  onDismiss,
  onUpdateNote,
  onDeleteNote,
  onMoveNote,
  pending,
  onSubmitPending,
  onCancelPending,
}: FileNoteMarkersProps) {
  const [dragPositions, setDragPositions] = useState<Record<number, NotePosition>>({});
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragRef = useRef<{
    noteId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const getMarkerPosition = (note: EditorFileNote) =>
    dragPositions[note.id] ?? { xPercent: note.xPercent, yPercent: note.yPercent };

  const handlePointerDown = (noteId: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest(".file-note-popover")) return;
    if (activeNoteId === noteId) return;

    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { noteId, startX: event.clientX, startY: event.clientY, moved: false };
    onDismiss?.();
    onCancelPending?.();
  };

  const handlePointerMove = (noteId: number, event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.noteId !== noteId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setDraggingId(noteId);
    }
    if (!drag.moved) return;

    setDragPositions((prev) => ({
      ...prev,
      [noteId]: resolvePosition(event.clientX, event.clientY),
    }));
  };

  const finishPointer = async (note: EditorFileNote, event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.noteId !== note.id) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const moved = drag.moved;
    const nextPosition = dragPositions[note.id];
    dragRef.current = null;
    setDraggingId(null);
    setDragPositions((prev) => {
      const copy = { ...prev };
      delete copy[note.id];
      return copy;
    });

    if (moved && onMoveNote && nextPosition) {
      await onMoveNote(note.id, nextPosition);
    }
  };

  const handleMarkerContextMenu = (noteId: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onCancelPending?.();
    onNoteClick(noteId);
  };

  return (
    <>
      {notes.map((note) => {
        const isActive = activeNoteId === note.id && draggingId !== note.id && !pending;
        const position = getMarkerPosition(note);
        const isDragging = draggingId === note.id;

        return (
          <div
            key={note.id}
            className={`file-note-marker ${isActive ? "active" : ""} ${isDragging ? "dragging" : ""}`}
            style={{ left: `${position.xPercent}%`, top: `${position.yPercent}%` }}
            title={`#${note.noteNumber}: ${note.content}`}
            onPointerDown={(event) => handlePointerDown(note.id, event)}
            onPointerMove={(event) => handlePointerMove(note.id, event)}
            onPointerUp={(event) => void finishPointer(note, event)}
            onPointerCancel={(event) => void finishPointer(note, event)}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => handleMarkerContextMenu(note.id, event)}
          >
            <span className="file-note-number file-note-number--marker">{note.noteNumber}</span>
            <span className="footnote-notebook-icon" aria-hidden />
            {isActive && onDismiss && onUpdateNote && (
              <FileNotePopover
                note={note}
                pageLabel={pageLabel}
                onClose={onDismiss}
                onSave={(content) => onUpdateNote(note.id, content)}
                onDelete={
                  onDeleteNote
                    ? async () => {
                        await onDeleteNote(note.id);
                      }
                    : undefined
                }
              />
            )}
          </div>
        );
      })}

      {pending && onSubmitPending && onCancelPending && (
        <div
          className="file-note-marker pending"
          style={{ left: `${pending.xPercent}%`, top: `${pending.yPercent}%` }}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="file-note-number file-note-number--marker">{pending.noteNumber}</span>
          <span className="footnote-notebook-icon" aria-hidden />
          <FileNotePopover
            pageLabel={pageLabel}
            pageNumber={pending.pageNumber}
            noteNumber={pending.noteNumber}
            onClose={onCancelPending}
            onSave={onSubmitPending}
          />
        </div>
      )}
    </>
  );
}
