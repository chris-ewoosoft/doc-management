import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EditorFileNote } from "@/lib/documentLocales";

interface FileNotePopoverProps {
  note: EditorFileNote;
  pageLabel?: string;
  onClose: () => void;
  onUpdate?: (content: string) => Promise<void>;
}

export default function FileNotePopover({
  note,
  pageLabel = "Page",
  onClose,
  onUpdate,
}: FileNotePopoverProps) {
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onUpdate || content.trim() === note.content) return;
    setIsSaving(true);
    try {
      await onUpdate(content.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="file-note-popover"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
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
      {onUpdate ? (
        <>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-16 text-xs resize-none"
          />
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={isSaving || !content.trim() || content.trim() === note.content}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </>
      ) : (
        <p className="file-note-popover-content">{note.content}</p>
      )}
    </div>
  );
}
