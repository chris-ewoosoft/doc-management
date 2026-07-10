import { toast } from "sonner";
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EditorFileNote } from "@/lib/documentLocales";

interface FileNotePopoverProps {
  note?: EditorFileNote;
  pageLabel?: string;
  pageNumber?: number;
  noteNumber?: number;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function FileNotePopover({
  note,
  pageLabel = "Page",
  pageNumber,
  noteNumber,
  onClose,
  onSave,
  onDelete,
}: FileNotePopoverProps) {
  const isCreate = !note;
  const [content, setContent] = useState(note?.content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resolvedPageNumber = note?.pageNumber ?? pageNumber ?? 1;
  const resolvedNoteNumber = note?.noteNumber ?? noteNumber;

  const handleSave = async () => {
    if (!content.trim()) return;
    if (!isCreate && content.trim() === note.content) return;
    setIsSaving(true);
    try {
      await onSave(content.trim());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="file-note-popover"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="file-note-popover-header">
        {resolvedNoteNumber != null && (
          <span className="file-note-number">{resolvedNoteNumber}</span>
        )}
        <span className="file-note-popover-meta">
          {isCreate ? `New note · ${pageLabel} ${resolvedPageNumber}` : `${pageLabel} ${resolvedPageNumber}`}
        </span>
        <button type="button" className="file-note-popover-close" onClick={onClose} aria-label="Close">
          <X className="w-3 h-3" />
        </button>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write note content..."
        className="min-h-16 text-xs resize-none"
        autoFocus
      />
      <div className="file-note-popover-footer">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={() => void handleSave()}
          disabled={
            isSaving ||
            isDeleting ||
            !content.trim() ||
            (!isCreate && content.trim() === note.content)
          }
        >
          {isSaving ? "Saving..." : isCreate ? "Add note" : "Save"}
        </Button>
        {!isCreate && onDelete && (
          <button
            type="button"
            className="file-note-popover-delete"
            onClick={() => void handleDelete()}
            disabled={isSaving || isDeleting}
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
