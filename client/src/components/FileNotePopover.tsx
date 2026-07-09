import { X } from "lucide-react";
import type { EditorFileNote } from "@/lib/documentLocales";

interface FileNotePopoverProps {
  note: EditorFileNote;
  pageLabel?: string;
  onClose: () => void;
}

export default function FileNotePopover({
  note,
  pageLabel = "Page",
  onClose,
}: FileNotePopoverProps) {
  return (
    <div
      className="file-note-popover"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="file-note-popover-header">
        <span className="file-note-number">{note.noteNumber}</span>
        <span className="file-note-popover-meta">
          {pageLabel} {note.pageNumber}
        </span>
        <button type="button" className="file-note-popover-close" onClick={onClose} aria-label="Close">
          <X className="w-3 h-3" />
        </button>
      </div>
      <p className="file-note-popover-content">{note.content}</p>
    </div>
  );
}
