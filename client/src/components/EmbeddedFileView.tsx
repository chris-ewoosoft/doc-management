import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ExternalLink, FileText, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileAnnotation } from "./FileAnnotationContext";
import PdfPageViewer from "./PdfPageViewer";
import FileOverlayAnnotator from "./FileOverlayAnnotator";

function toAbsoluteUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function isLocalHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function officeEmbedUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(toAbsoluteUrl(fileUrl))}`;
}

export default function EmbeddedFileView({ node, selected }: NodeViewProps) {
  const { url, fileName, fileType, embeddedId } = node.attrs as {
    url: string;
    fileName: string;
    fileType: "pdf" | "ppt";
    embeddedId: string;
  };

  const annotation = useFileAnnotation();

  const isPdf = fileType === "pdf";
  const absoluteUrl = toAbsoluteUrl(url);
  const canOfficeEmbed = !isPdf && !isLocalHost();
  const resolvedEmbeddedId = embeddedId || `legacy-${url}`;

  const fileNotes = annotation?.fileNotes.filter((n) => n.embeddedId === resolvedEmbeddedId) ?? [];

  const dismissNote = () => annotation?.setActiveFileNoteId(null);
  const selectNote = (id: number) => annotation?.setActiveFileNoteId(id);

  const handleAddNote = async (input: {
    pageNumber: number;
    xPercent: number;
    yPercent: number;
    content: string;
  }) => {
    if (!annotation) return;
    await annotation.onAddFileNote({
      embeddedId: resolvedEmbeddedId,
      fileUrl: url,
      fileName,
      fileType,
      ...input,
    });
  };

  const nativePptViewer = (
    <iframe
      src={officeEmbedUrl(url)}
      title={fileName}
      className="embedded-file-frame"
      loading="lazy"
      allowFullScreen
    />
  );

  const pptFallback = (
    <div className="embedded-file-fallback">
      <Presentation className="w-10 h-10 text-orange-500 mb-2" />
      <p className="text-sm font-medium">{fileName}</p>
      <p className="text-xs text-muted-foreground mt-1 mb-3 text-center max-w-sm">
        Right-click on the slide area to add a note. Open file for full view.
      </p>
      <Button size="sm" asChild>
        <a href={absoluteUrl} target="_blank" rel="noopener noreferrer">
          View presentation
        </a>
      </Button>
    </div>
  );

  const renderPptViewer = () => {
    if (canOfficeEmbed) return nativePptViewer;
    return pptFallback;
  };

  return (
    <NodeViewWrapper
      className={`embedded-file-block my-3 ${selected ? "ring-2 ring-accent rounded-sm" : ""}`}
      contentEditable={false}
    >
      <div className="embedded-file-header">
        <div className="flex items-center gap-2 min-w-0">
          {isPdf ? (
            <FileText className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Presentation className="w-4 h-4 text-orange-600 shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{fileName}</span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0">
            {isPdf ? "PDF" : "PPT"}
          </span>
          {fileNotes.length > 0 && (
            <span className="text-[10px] text-amber-700 font-semibold shrink-0">
              {fileNotes.length} note{fileNotes.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" asChild>
          <a href={absoluteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Open
          </a>
        </Button>
      </div>

      {annotation && isPdf ? (
        <PdfPageViewer
          url={absoluteUrl}
          embeddedId={resolvedEmbeddedId}
          fileName={fileName}
          notes={annotation.fileNotes}
          activeNoteId={annotation.activeFileNoteId}
          onNoteClick={selectNote}
          onDismiss={dismissNote}
          onAddNote={handleAddNote}
          onUpdateNote={annotation.onUpdateFileNote}
        />
      ) : annotation && !isPdf ? (
        <FileOverlayAnnotator
          embeddedId={resolvedEmbeddedId}
          fileName={fileName}
          pageLabel="Slide"
          notes={annotation.fileNotes}
          activeNoteId={annotation.activeFileNoteId}
          onNoteClick={selectNote}
          onDismiss={dismissNote}
          onAddNote={handleAddNote}
          onUpdateNote={annotation.onUpdateFileNote}
        >
          {renderPptViewer}
        </FileOverlayAnnotator>
      ) : isPdf ? (
        <iframe
          src={`${absoluteUrl}#toolbar=1&navpanes=0&view=FitH`}
          title={fileName}
          className="embedded-file-frame"
          loading="lazy"
        />
      ) : (
        renderPptViewer()
      )}
    </NodeViewWrapper>
  );
}
