import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNextNoteNumber, type EditorFileNote } from "@/lib/documentLocales";
import FileNoteMarkers, { type NotePosition } from "./FileNoteMarkers";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfPageViewerProps {
  url: string;
  embeddedId: string;
  fileName: string;
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

export default function PdfPageViewer({
  url,
  embeddedId,
  fileName,
  notes,
  activeNoteId,
  onNoteClick,
  onDismiss,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onMoveNote,
}: PdfPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    pageNumber: number;
    xPercent: number;
    yPercent: number;
  } | null>(null);

  const fileNotes = notes.filter((n) => n.embeddedId === embeddedId);
  const pageNotes = fileNotes.filter((n) => n.pageNumber === pageNumber);
  const nextNoteNumber = getNextNoteNumber(fileNotes);

  const resolvePosition = useCallback((clientX: number, clientY: number): NotePosition => {
    const surface = surfaceRef.current;
    if (!surface) return { xPercent: 0, yPercent: 0 };
    const rect = surface.getBoundingClientRect();
    return {
      xPercent: clampPercent(((clientX - rect.left) / rect.width) * 100),
      yPercent: clampPercent(((clientY - rect.top) / rect.height) * 100),
    };
  }, []);

  const renderPage = useCallback(async (pdf: pdfjs.PDFDocumentProxy, pageNum: number) => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    renderTaskRef.current?.cancel();
    const page = await pdf.getPage(pageNum);
    const containerWidth = Math.max(scroll.clientWidth - 2, 320);
    const baseViewport = page.getViewport({ scale: 1 });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const displayScale = containerWidth / baseViewport.width;
    const viewport = page.getViewport({ scale: displayScale * pixelRatio });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
    canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const task = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });
    renderTaskRef.current = task;
    await task.promise;
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
      renderTaskRef.current?.cancel();
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
    const scroll = scrollRef.current;
    if (!scroll) return;

    const observer = new ResizeObserver(() => {
      const pdf = pdfRef.current;
      if (pdf && !loading) {
        renderPage(pdf, pageNumber).catch(console.error);
      }
    });

    observer.observe(scroll);
    return () => observer.disconnect();
  }, [pageNumber, loading, renderPage]);

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (pending) return;
    onDismiss?.();
    setPending(positionFromEvent(event, pageNumber));
  };

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
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
    const pdf = pdfRef.current;
    if (pdf) await renderPage(pdf, pageNumber);
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
      <div className="embedded-file-viewer">
        <div className="embedded-file-toolbar">
          <span className="text-[11px] text-muted-foreground">
            Left-drag to move · Right-click to add or edit note
          </span>
        </div>
        <div ref={scrollRef} className="pdf-scroll-container">
          <div
            ref={surfaceRef}
            className="pdf-page-surface pdf-page-surface--error"
            onContextMenu={handleContextMenu}
            onClick={handleSurfaceClick}
          >
            <p className="pdf-page-error text-destructive text-sm p-4 text-center">{error}</p>
            <FileNoteMarkers
              notes={pageNotes}
              activeNoteId={activeNoteId}
              pageLabel="Page"
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
        <span className="text-[11px] text-muted-foreground">
          Left-drag to move · Right-click to add or edit note
        </span>
      </div>

      <div ref={scrollRef} className="pdf-scroll-container">
        <div
          ref={surfaceRef}
          className="pdf-page-surface"
          onContextMenu={handleContextMenu}
          onClick={handleSurfaceClick}
        >
          <canvas ref={canvasRef} className="pdf-page-canvas pdf-page-canvas--passive" />
          <FileNoteMarkers
            notes={pageNotes}
            activeNoteId={activeNoteId}
            pageLabel="Page"
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
