import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading2,
  Heading3,
  Quote,
  Image as ImageIcon,
  Paperclip,
  MessageSquarePlus,
  NotebookPen,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentHighlight } from "./CommentHighlight";
import { FootnoteReference } from "./FootnoteReference";
import { EmbeddedFile } from "./EmbeddedFile";
import type { EditorComment, EditorNote } from "@/lib/documentLocales";
import { toast } from "sonner";
import "./RichTextEditor.css";

const lowlight = createLowlight(common);

export interface FileUploadResult {
  url: string;
  fileName: string;
  mimeType: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onFileUpload?: (file: File) => Promise<FileUploadResult>;
  readOnly?: boolean;
  fillHeight?: boolean;
  comments?: EditorComment[];
  activeCommentId?: number | null;
  onCommentClick?: (commentId: number) => void;
  onAddInlineComment?: (from: number, to: number, text: string) => Promise<void>;
  notes?: EditorNote[];
  activeNoteId?: number | null;
  onNoteClick?: (noteId: number) => void;
  onAddNote?: (position: number, content: string) => Promise<{ id: number; noteNumber: number }>;
  onUpdateNote?: (noteId: number, content: string) => Promise<void>;
  scrollContainerRef?: (element: HTMLDivElement | null) => void;
  onContentScroll?: () => void;
  label?: string;
}

function isDocumentFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type === "application/vnd.ms-powerpoint" ||
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.name.endsWith(".pdf") ||
    file.name.endsWith(".ppt") ||
    file.name.endsWith(".pptx")
  );
}

function fileTypeFromResult(mimeType: string, fileName: string): "pdf" | "ppt" {
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) return "pdf";
  return "ppt";
}

export default function RichTextEditor({
  content,
  onChange,
  onImageUpload,
  onFileUpload,
  readOnly = false,
  fillHeight = false,
  comments = [],
  activeCommentId,
  onCommentClick,
  onAddInlineComment,
  notes = [],
  activeNoteId,
  onNoteClick,
  onAddNote,
  onUpdateNote,
  scrollContainerRef,
  onContentScroll,
  label,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [footnoteDraft, setFootnoteDraft] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showFootnoteForm, setShowFootnoteForm] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isPostingFootnote, setIsPostingFootnote] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const appliedCommentsRef = useRef<Set<number>>(new Set());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ allowBase64: true }),
      CommentHighlight,
      FootnoteReference,
      EmbeddedFile,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    scrollContainerRef?.(scrollRef.current);
    return () => scrollContainerRef?.(null);
  }, [scrollContainerRef, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content, { emitUpdate: false });
      appliedCommentsRef.current.clear();
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor || readOnly) return;

    for (const comment of comments) {
      if (
        comment.resolved ||
        comment.position == null ||
        comment.selectionEnd == null ||
        appliedCommentsRef.current.has(comment.id)
      ) {
        continue;
      }

      const from = comment.position;
      const to = comment.selectionEnd;
      if (from >= 0 && to > from && to <= editor.state.doc.content.size) {
        editor
          .chain()
          .setTextSelection({ from, to })
          .setMark("commentHighlight", { commentId: String(comment.id) })
          .run();
        appliedCommentsRef.current.add(comment.id);
      }
    }
  }, [comments, editor, readOnly]);

  useEffect(() => {
    if (!editor) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mark = target.closest("mark[data-comment-id]");
      if (mark && onCommentClick) {
        const id = Number(mark.getAttribute("data-comment-id"));
        if (!Number.isNaN(id)) onCommentClick(id);
        return;
      }

      const footnote = target.closest("[data-footnote-ref]");
      if (footnote && onNoteClick) {
        const id = Number(footnote.getAttribute("data-note-id"));
        if (!Number.isNaN(id)) onNoteClick(id);
      }
    };

    const el = editor.view.dom;
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [editor, onCommentClick, onNoteClick]);

  if (!editor) return null;

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (onImageUpload) {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          editor.chain().focus().setImage({ src: url }).run();
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    }

    event.target.value = "";
  };

  const handleDocumentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isDocumentFile(file)) {
      toast.error("Only PDF, PPT, and PPTX files are supported");
      event.target.value = "";
      return;
    }

    if (!onFileUpload) {
      toast.error("File upload is not available");
      event.target.value = "";
      return;
    }

    setIsUploadingFile(true);
    try {
      const result = await onFileUpload(file);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "embeddedFile",
          attrs: {
            url: result.url,
            fileName: result.fileName,
            mimeType: result.mimeType,
            fileType: fileTypeFromResult(result.mimeType, result.fileName),
            embeddedId: crypto.randomUUID(),
          },
        })
        .run();
      toast.success(`${result.fileName} embedded in document`);
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  };

  const submitInlineComment = async () => {
    if (!onAddInlineComment || !commentDraft.trim()) return;

    const { from, to } = editor.state.selection;
    if (from === to) return;

    setIsPostingComment(true);
    try {
      await onAddInlineComment(from, to, commentDraft.trim());
      editor
        .chain()
        .setTextSelection({ from, to })
        .setMark("commentHighlight", { commentId: "pending" })
        .run();
      setCommentDraft("");
      setShowCommentForm(false);
    } finally {
      setIsPostingComment(false);
    }
  };

  const submitFootnote = async () => {
    if (!onAddNote || !footnoteDraft.trim()) return;

    const position = editor.state.selection.from;
    setIsPostingFootnote(true);
    try {
      const result = await onAddNote(position, footnoteDraft.trim());
      editor
        .chain()
        .focus()
        .insertContent({
          type: "footnoteReference",
          attrs: { noteId: String(result.id), number: result.noteNumber },
        })
        .run();
      setFootnoteDraft("");
      setShowFootnoteForm(false);
    } finally {
      setIsPostingFootnote(false);
    }
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    icon,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    icon: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-sm transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-secondary text-foreground"
      }`}
      title={title}
      type="button"
    >
      {icon}
    </button>
  );

  const unresolvedInline = comments.filter(
    (c) => !c.resolved && c.position != null && c.selectionEnd != null
  );

  const containerClass = fillHeight
    ? "border border-border rounded-sm overflow-hidden flex flex-col flex-1 min-h-0 h-full"
    : "border border-border rounded-sm overflow-hidden flex flex-col min-h-96";

  if (readOnly) {
    return (
      <div className="prose prose-sm max-w-none border border-border rounded-sm p-4">
        {label && <p className="text-xs font-semibold uppercase tracking-widest mb-3">{label}</p>}
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="bg-secondary border-b border-border p-2 flex flex-wrap gap-0.5 shrink-0">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={<Bold className="w-3.5 h-3.5" />}
          title="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={<Italic className="w-3.5 h-3.5" />}
          title="Italic"
        />
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 className="w-3.5 h-3.5" />}
          title="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          icon={<Heading3 className="w-3.5 h-3.5" />}
          title="Heading 3"
        />
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={<List className="w-3.5 h-3.5" />}
          title="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={<ListOrdered className="w-3.5 h-3.5" />}
          title="Ordered List"
        />
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          icon={<Code className="w-3.5 h-3.5" />}
          title="Code Block"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          icon={<Quote className="w-3.5 h-3.5" />}
          title="Blockquote"
        />
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton
          onClick={() => imageInputRef.current?.click()}
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          title="Insert Image"
        />
        <ToolbarButton
          onClick={() => docInputRef.current?.click()}
          icon={<Paperclip className="w-3.5 h-3.5" />}
          title="Upload PDF or PPT"
        />
        {onAddInlineComment && (
          <ToolbarButton
            onClick={() => {
              setShowFootnoteForm(false);
              setShowCommentForm((v) => !v);
            }}
            isActive={showCommentForm}
            icon={<MessageSquarePlus className="w-3.5 h-3.5" />}
            title="Comment on selection"
          />
        )}
        {onAddNote && (
          <ToolbarButton
            onClick={() => {
              setShowCommentForm(false);
              setShowFootnoteForm((v) => !v);
            }}
            isActive={showFootnoteForm}
            icon={<NotebookPen className="w-3.5 h-3.5 text-amber-500" />}
            title="Insert footnote at cursor"
          />
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={handleDocumentSelect}
          className="hidden"
        />
      </div>

      {isUploadingFile && (
        <div className="border-b border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shrink-0">
          Uploading document...
        </div>
      )}

      {editor && onAddInlineComment && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed }: { editor: typeof editor }) => !ed.state.selection.empty}
        >
          <div className="flex gap-1 bg-background border border-border rounded-sm shadow-md p-1">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1 h-8"
              onClick={() => {
                setShowFootnoteForm(false);
                setShowCommentForm(true);
              }}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Comment
            </Button>
          </div>
        </BubbleMenu>
      )}

      {editor && onAddNote && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed }: { editor: typeof editor }) => ed.state.selection.empty}
        >
          <div className="flex gap-1 bg-background border border-border rounded-sm shadow-md p-1">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1 h-8"
              onClick={() => {
                setShowCommentForm(false);
                setShowFootnoteForm(true);
              }}
            >
              <NotebookPen className="w-3.5 h-3.5 text-amber-500" />
              Footnote
            </Button>
          </div>
        </BubbleMenu>
      )}

      {showCommentForm && onAddInlineComment && (
        <div className="border-b border-border bg-card p-2 space-y-2 shrink-0">
          <p className="text-xs font-medium text-muted-foreground">Comment on selected text</p>
          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Write your comment..."
            className="min-h-14 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={submitInlineComment}
              disabled={!commentDraft.trim() || isPostingComment || editor.state.selection.empty}
            >
              {isPostingComment ? "Posting..." : "Post"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCommentForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showFootnoteForm && onAddNote && (
        <div className="border-b border-border bg-card p-2 space-y-2 shrink-0">
          <p className="text-xs font-medium text-muted-foreground">
            Footnote at cursor (like Word)
          </p>
          <Textarea
            value={footnoteDraft}
            onChange={(e) => setFootnoteDraft(e.target.value)}
            placeholder="Footnote content..."
            className="min-h-14 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={submitFootnote}
              disabled={!footnoteDraft.trim() || isPostingFootnote}
            >
              {isPostingFootnote ? "Adding..." : "Insert footnote"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFootnoteForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={onContentScroll}
          className="editor-scroll-area flex-1 bg-background p-3 overflow-y-auto overflow-x-hidden"
        >
          <EditorContent editor={editor} className="prose prose-sm max-w-none min-h-full" />
        </div>

        {unresolvedInline.length > 0 && (
          <aside className="w-40 border-l border-border bg-secondary/30 p-2 overflow-y-auto space-y-1 hidden 2xl:block shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Comments
            </p>
            {unresolvedInline.map((comment) => (
              <button
                key={comment.id}
                type="button"
                onClick={() => onCommentClick?.(comment.id)}
                className={`w-full text-left text-[11px] p-1.5 rounded-sm border transition-colors ${
                  activeCommentId === comment.id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:bg-secondary"
                }`}
              >
                <span className="line-clamp-3">{comment.content}</span>
              </button>
            ))}
          </aside>
        )}
      </div>

      {notes.length > 0 && (
        <div className="footnotes-panel border-t border-border bg-secondary/20 shrink-0 max-h-28 overflow-y-auto p-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Footnotes
          </p>
          {notes.map((note) => (
            <div
              key={note.id}
              id={`footnote-${note.id}`}
              className={`text-xs flex gap-2 p-1.5 rounded-sm items-start ${
                activeNoteId === note.id ? "bg-accent/10 border border-accent" : ""
              }`}
            >
              <span className="footnote-notebook-icon shrink-0 mt-0.5" aria-hidden />
              {onUpdateNote ? (
                <input
                  className="flex-1 bg-transparent border-b border-border/50 outline-none text-xs"
                  defaultValue={note.content}
                  onBlur={(e) => {
                    if (e.target.value !== note.content) {
                      onUpdateNote(note.id, e.target.value);
                    }
                  }}
                />
              ) : (
                <span className="flex-1">{note.content}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
