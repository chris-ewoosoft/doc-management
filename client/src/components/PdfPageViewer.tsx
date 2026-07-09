import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EditorFileNote } from "@/lib/documentLocales";
import FileNoteMarkers from "./FileNoteMarkers";
import FileNotesList from "./FileNotesList";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfPageViewerProps {
  url: string;
  embeddedId: string;
  fileName: string;
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
}

export default function PdfPageViewer({
  url,
  embeddedId,
  fileName,
  notes,
  annotateMode,
  activeNoteId,
  onNoteClick,
  onDismiss,
  onAddNote,
  onUpdateNote,
}: PdfPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{
    pageNumber: number;
    xPercent: number;
    yPercent: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pdfRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const fileNotes = notes.filter((n) => n.embeddedId === embeddedId);
  const pageNotes = fileNotes.filter((n) => n.pageNumber === pageNumber);
  const nextNoteNumber = fileNotes.length + 1;

  const renderPage = useCallback(async (pdf: pdfjs.PDFDocumentProxy, pageNum: number) => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const page = await pdf.getPage(pageNum);
    const containerWidth = scroll.clientWidth || 800;
    const baseViewport = page.getViewport({ scale: 1 });
    const displayScale = containerWidth / baseViewport.width;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: displayScale });

    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    const transform =
      pixelRatio !== 1
        ? ([pixelRatio, 0, 0, pixelRatio, 0, 0] as [number, number, number, number, number, number])
        : undefined;

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform,
    }).promise;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setPageNumber(1);
        await renderPage(pdf, 1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
      pdfRef.current = null;
    };
  }, [url, renderPage]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || loading) return;
    renderPage(pdf, pageNumber).catch(console.error);
    scrollRef.current?.scrollTo(0, 0);
  }, [pageNumber, loading, renderPage]);

  useEffect(() => {
    const onResize = () => {
      const pdf = pdfRef.current;
      if (pdf && !loading) renderPage(pdf, pageNumber).catch(console.error);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pageNumber, loading, renderPage]);

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
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

  const handleListNoteClick = (note: EditorFileNote) => {
    if (activeNoteId === note.id) {
      onDismiss?.();
      return;
    }
    setPageNumber(note.pageNumber);
    onNoteClick(note.id);
    requestAnimationFrame(() => {
      surfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const handleMarkerClick = (id: number) => {
    if (activeNoteId === id) {
      onDismiss?.();
      return;
    }
    onNoteClick(id);
  };

  if (loading) {
    return (
      <div className="embedded-file-frame flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div className="embedded-file-frame flex items-center justify-center text-destructive text-sm p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="embedded-file-viewer">
      <div className="embedded-file-toolbar">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs tabular-nums px-1">
            Page {pageNumber} / {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={pageNumber >= pageCount}
            onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {annotateMode ? (
          <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <NotebookPen className="w-3.5 h-3.5" />
            Click on page — markers scroll with content
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Scroll page to read — notes follow text</span>
        )}
      </div>

      <div ref={scrollRef} className="pdf-scroll-container">
        <div
          ref={surfaceRef}
          className={`pdf-page-surface ${annotateMode ? "annotate-mode" : ""}`}
          onClick={handleSurfaceClick}
        >
          <canvas ref={canvasRef} className="pdf-page-canvas" />
          <FileNoteMarkers
            notes={pageNotes}
            activeNoteId={activeNoteId}
            pageLabel="Page"
            onNoteClick={handleMarkerClick}
            onDismiss={onDismiss}
            pending={
              pending
                ? { ...pending, noteNumber: nextNoteNumber }
                : null
            }
          />
        </div>
      </div>

      {pending && (
        <div className="embedded-file-note-form">
          <p className="text-xs font-medium text-muted-foreground">
            Note #{nextNoteNumber} on {fileName} — page {pending.pageNumber}
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
        pageLabel="Page"
        onNoteClick={handleListNoteClick}
        onDismiss={onDismiss}
        onUpdateNote={onUpdateNote}
      />
    </div>
  );
}
