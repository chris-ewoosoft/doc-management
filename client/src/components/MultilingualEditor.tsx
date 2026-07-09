import { useCallback, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor, { type FileUploadResult } from "@/components/RichTextEditor";
import {
  DOCUMENT_LOCALES,
  type DocumentLocaleCode,
  type EditorComment,
  type EditorFileNote,
  type EditorNote,
  type LocaleContent,
} from "@/lib/documentLocales";
import {
  FileAnnotationContext,
  type FileAnnotationBase,
} from "@/components/FileAnnotationContext";

interface MultilingualEditorProps {
  locales: LocaleContent;
  onLocaleChange: (locale: DocumentLocaleCode, field: "title" | "content", value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onFileUpload?: (file: File) => Promise<FileUploadResult>;
  comments?: EditorComment[];
  activeCommentId?: number | null;
  onCommentClick?: (commentId: number) => void;
  onAddInlineComment?: (from: number, to: number, text: string) => Promise<void>;
  notes?: EditorNote[];
  activeNoteId?: number | null;
  onNoteClick?: (noteId: number) => void;
  onAddNote?: (
    locale: DocumentLocaleCode,
    position: number,
    content: string
  ) => Promise<{ id: number; noteNumber: number }>;
  onUpdateNote?: (noteId: number, content: string) => Promise<void>;
  fileAnnotationBase?: FileAnnotationBase;
  fileNotes?: EditorFileNote[];
}

function getScrollRatio(element: HTMLDivElement) {
  const max = element.scrollHeight - element.clientHeight;
  return max > 0 ? element.scrollTop / max : 0;
}

function setScrollRatio(element: HTMLDivElement, ratio: number) {
  const max = element.scrollHeight - element.clientHeight;
  element.scrollTop = ratio * max;
}

export default function MultilingualEditor({
  locales,
  onLocaleChange,
  onImageUpload,
  onFileUpload,
  comments,
  activeCommentId,
  onCommentClick,
  onAddInlineComment,
  notes = [],
  activeNoteId,
  onNoteClick,
  onAddNote,
  onUpdateNote,
  fileAnnotationBase,
  fileNotes = [],
}: MultilingualEditorProps) {
  const [visibleLocales, setVisibleLocales] = useState<Record<DocumentLocaleCode, boolean>>({
    en: true,
    vi: true,
    ko: true,
  });

  const activeLocales = useMemo(
    () => DOCUMENT_LOCALES.filter(({ code }) => visibleLocales[code]),
    [visibleLocales]
  );

  const scrollContainers = useRef<Map<DocumentLocaleCode, HTMLDivElement | null>>(new Map());
  const isSyncingScroll = useRef(false);

  const toggleLocale = (code: DocumentLocaleCode) => {
    setVisibleLocales((prev) => {
      const visibleCount = Object.values(prev).filter(Boolean).length;
      if (prev[code] && visibleCount <= 1) return prev;
      return { ...prev, [code]: !prev[code] };
    });
  };

  const handleSyncScroll = useCallback(
    (sourceCode: DocumentLocaleCode) => {
      if (isSyncingScroll.current) return;

      const source = scrollContainers.current.get(sourceCode);
      if (!source) return;

      isSyncingScroll.current = true;
      const ratio = getScrollRatio(source);

      activeLocales.forEach(({ code }) => {
        if (code === sourceCode) return;
        const element = scrollContainers.current.get(code);
        if (element) setScrollRatio(element, ratio);
      });

      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    },
    [activeLocales]
  );

  const registerScrollContainer = useCallback(
    (code: DocumentLocaleCode, element: HTMLDivElement | null) => {
      if (element) {
        scrollContainers.current.set(code, element);
      } else {
        scrollContainers.current.delete(code);
      }
    },
    []
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full gap-2">
      <div className="flex flex-wrap items-center gap-2 shrink-0 px-1">
        <span className="text-xs text-muted-foreground mr-1">Languages:</span>
        {DOCUMENT_LOCALES.map(({ code, label, flag }) => {
          const isOn = visibleLocales[code];
          const isLastVisible = isOn && activeLocales.length === 1;
          return (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={isOn ? "default" : "outline"}
              className="h-7 px-2.5 text-xs gap-1.5"
              disabled={isLastVisible}
              title={isLastVisible ? "At least one language must stay visible" : undefined}
              onClick={() => toggleLocale(code)}
            >
              <span className="font-bold">{flag}</span>
              {label}
            </Button>
          );
        })}
      </div>

      <div
        className="grid gap-2 flex-1 min-h-0 h-full"
        style={{ gridTemplateColumns: `repeat(${activeLocales.length}, minmax(0, 1fr))` }}
      >
        {activeLocales.map(({ code, label, flag }) => (
          <div key={code} className="flex flex-col min-h-0 min-w-0 h-full gap-2">
            <div className="flex items-center gap-2 shrink-0 px-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-sm bg-accent text-accent-foreground text-xs font-bold">
                {flag}
              </span>
              <span className="text-sm font-semibold truncate">{label}</span>
            </div>

            <Input
              value={locales[code].title}
              onChange={(e) => onLocaleChange(code, "title", e.target.value)}
              placeholder={`Title (${flag})...`}
              className="font-medium shrink-0 h-9"
            />

            {fileAnnotationBase ? (
              <FileAnnotationContext.Provider
                value={{
                  ...fileAnnotationBase,
                  locale: code,
                  fileNotes: fileNotes.filter((n) => n.locale === code),
                  onAddFileNote: (input) => fileAnnotationBase.onAddFileNote(code, input),
                }}
              >
                <RichTextEditor
                  fillHeight
                  label={label}
                  content={locales[code].content}
                  onChange={(value) => onLocaleChange(code, "content", value)}
                  onImageUpload={onImageUpload}
                  onFileUpload={onFileUpload}
                  comments={code === "en" ? comments : []}
                  activeCommentId={code === "en" ? activeCommentId : null}
                  onCommentClick={onCommentClick}
                  onAddInlineComment={code === "en" ? onAddInlineComment : undefined}
                  notes={notes.filter((n) => n.locale === code)}
                  activeNoteId={activeNoteId}
                  onNoteClick={onNoteClick}
                  onAddNote={
                    onAddNote
                      ? (position, content) => onAddNote(code, position, content)
                      : undefined
                  }
                  onUpdateNote={onUpdateNote}
                  scrollContainerRef={(el) => registerScrollContainer(code, el)}
                  onContentScroll={() => handleSyncScroll(code)}
                />
              </FileAnnotationContext.Provider>
            ) : (
              <RichTextEditor
                fillHeight
                label={label}
                content={locales[code].content}
                onChange={(value) => onLocaleChange(code, "content", value)}
                onImageUpload={onImageUpload}
                onFileUpload={onFileUpload}
                comments={code === "en" ? comments : []}
                activeCommentId={code === "en" ? activeCommentId : null}
                onCommentClick={onCommentClick}
                onAddInlineComment={code === "en" ? onAddInlineComment : undefined}
                notes={notes.filter((n) => n.locale === code)}
                activeNoteId={activeNoteId}
                onNoteClick={onNoteClick}
                onAddNote={
                  onAddNote
                    ? (position, content) => onAddNote(code, position, content)
                    : undefined
                }
                onUpdateNote={onUpdateNote}
                scrollContainerRef={(el) => registerScrollContainer(code, el)}
                onContentScroll={() => handleSyncScroll(code)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
