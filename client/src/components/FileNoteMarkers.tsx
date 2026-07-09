import type { EditorFileNote } from "@/lib/documentLocales";
import FileNotePopover from "./FileNotePopover";

interface FileNoteMarkersProps {
  notes: EditorFileNote[];
  activeNoteId: number | null;
  pageLabel?: string;
  onNoteClick: (id: number) => void;
  onDismiss?: () => void;
  pending?: { xPercent: number; yPercent: number; noteNumber?: number } | null;
}

export default function FileNoteMarkers({
  notes,
  activeNoteId,
  pageLabel = "Page",
  onNoteClick,
  onDismiss,
  pending,
}: FileNoteMarkersProps) {
  return (
    <>
      {notes.map((note) => {
        const isActive = activeNoteId === note.id;
        return (
          <button
            key={note.id}
            type="button"
            className={`file-note-marker ${isActive ? "active" : ""}`}
            style={{ left: `${note.xPercent}%`, top: `${note.yPercent}%` }}
            title={`#${note.noteNumber}: ${note.content}`}
            onClick={(e) => {
              e.stopPropagation();
              onNoteClick(note.id);
            }}
          >
            <span className="file-note-number file-note-number--marker">{note.noteNumber}</span>
            <span className="footnote-notebook-icon" aria-hidden />
            {isActive && onDismiss && (
              <FileNotePopover note={note} pageLabel={pageLabel} onClose={onDismiss} />
            )}
          </button>
        );
      })}
      {pending && (
        <span
          className="file-note-marker pending"
          style={{ left: `${pending.xPercent}%`, top: `${pending.yPercent}%` }}
        >
          {pending.noteNumber != null && (
            <span className="file-note-number file-note-number--marker">{pending.noteNumber}</span>
          )}
          <span className="footnote-notebook-icon" aria-hidden />
        </span>
      )}
    </>
  );
}
