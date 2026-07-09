import type { EditorFileNote } from "@/lib/documentLocales";
import FileNotePopover from "./FileNotePopover";

interface FileNotesListProps {
  notes: EditorFileNote[];
  activeNoteId: number | null;
  pageLabel?: string;
  onNoteClick: (note: EditorFileNote) => void;
  onDismiss?: () => void;
  onUpdateNote: (noteId: number, content: string) => Promise<void>;
}

export default function FileNotesList({
  notes,
  activeNoteId,
  pageLabel = "Page",
  onNoteClick,
  onDismiss,
  onUpdateNote,
}: FileNotesListProps) {
  if (notes.length === 0) return null;

  const sorted = [...notes].sort((a, b) => a.noteNumber - b.noteNumber);
  const activeNote = sorted.find((n) => n.id === activeNoteId) ?? null;

  return (
    <div className="embedded-file-notes-panel">
      <p className="embedded-file-notes-panel-title">Notes ({sorted.length})</p>

      {activeNote && onDismiss && (
        <div className="embedded-file-notes-detail">
          <FileNotePopover note={activeNote} pageLabel={pageLabel} onClose={onDismiss} />
        </div>
      )}

      <div className="embedded-file-notes-list">
        {sorted.map((note) => (
          <div
            key={note.id}
            className={`embedded-file-note-item ${activeNoteId === note.id ? "active" : ""}`}
          >
            <button
              type="button"
              className="embedded-file-note-item-header"
              onClick={() => onNoteClick(note)}
            >
              <span className="file-note-number">{note.noteNumber}</span>
              <span className="embedded-file-note-meta">
                {pageLabel} {note.pageNumber}
              </span>
              <span className="embedded-file-note-preview">{note.content}</span>
            </button>
            <input
              className="embedded-file-note-input"
              defaultValue={note.content}
              onBlur={(e) => {
                if (e.target.value !== note.content) {
                  onUpdateNote(note.id, e.target.value);
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
