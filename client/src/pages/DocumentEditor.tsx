import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Save, Clock, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import MultilingualEditor from "@/components/MultilingualEditor";
import InlineComments from "@/components/InlineComments";
import EditorialLayout from "@/components/EditorialLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DOCUMENT_LOCALES,
  emptyLocaleContent,
  type DocumentLocaleCode,
  type LocaleContent,
} from "@/lib/documentLocales";
import type { FileAnnotationBase } from "@/components/FileAnnotationContext";
import type { FileUploadResult } from "@/components/RichTextEditor";

function localesFromDocument(
  doc: {
    title: string;
    content: string;
    locales?: Array<{ locale: DocumentLocaleCode; title: string; content: string }>;
  } | null | undefined
): LocaleContent {
  const base = emptyLocaleContent();
  if (!doc) return base;

  if (doc.locales?.length) {
    for (const row of doc.locales) {
      base[row.locale] = { title: row.title, content: row.content };
    }
    return base;
  }

  base.en = { title: doc.title, content: doc.content };
  return base;
}

function buildSnapshot(data: {
  title: string;
  description: string;
  projectCategory: string;
  locales: LocaleContent;
}) {
  return JSON.stringify(data);
}

function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "ppt") return "application/vnd.ms-powerpoint";
  if (ext === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/octet-stream";
}

export default function DocumentEditor() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/documents/:id");
  const isNew = !match || params?.id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [locales, setLocales] = useState<LocaleContent>(emptyLocaleContent());
  const [projectCategory, setProjectCategory] = useState("Backend");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [activeFileNoteId, setActiveFileNoteId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const documentId = isNew ? null : Number(params?.id);

  const { data: document, refetch: refetchDocument } = trpc.documents.getById.useQuery(
    { id: documentId! },
    { enabled: !!documentId }
  );

  const { data: comments = [], refetch: refetchComments } = trpc.documents.getComments.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId }
  );

  const { data: revisions = [] } = trpc.documents.getRevisions.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId }
  );

  const { data: notes = [], refetch: refetchNotes } = trpc.documents.getNotes.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId }
  );

  const createNote = trpc.documents.createNote.useMutation({
    onSuccess: () => refetchNotes(),
  });

  const updateNote = trpc.documents.updateNote.useMutation({
    onSuccess: () => refetchNotes(),
  });

  const { data: fileNotes = [], refetch: refetchFileNotes } = trpc.documents.getFileNotes.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId }
  );

  const createFileNote = trpc.documents.createFileNote.useMutation({
    onSuccess: () => refetchFileNotes(),
  });

  const updateFileNote = trpc.documents.updateFileNote.useMutation({
    onSuccess: () => refetchFileNotes(),
  });

  const createDoc = trpc.documents.create.useMutation({
    onSuccess: (data) => {
      navigate(`/documents/${data.id}`);
    },
  });

  const updateDoc = trpc.documents.update.useMutation({
    onSuccess: async () => {
      if (documentId) {
        await refetchDocument();
        refetchComments();
      }
    },
  });

  const addComment = trpc.documents.createComment.useMutation({
    onSuccess: () => refetchComments(),
  });

  const resolveComment = trpc.documents.updateComment.useMutation({
    onSuccess: () => refetchComments(),
  });

  const deleteComment = trpc.documents.deleteComment.useMutation({
    onSuccess: () => refetchComments(),
  });

  const uploadAttachment = trpc.documents.uploadAttachment.useMutation();

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        title,
        description,
        projectCategory,
        locales,
      }),
    [title, description, projectCategory, locales]
  );

  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;
  const isSaved = savedSnapshot !== null && !isDirty;

  useEffect(() => {
    if (!document) return;

    const loadedLocales = localesFromDocument(document);
    setTitle(document.title);
    setDescription(document.description || "");
    setContent(document.content);
    setLocales(loadedLocales);
    setProjectCategory(document.projectCategory);
    setSavedSnapshot(
      buildSnapshot({
        title: document.title,
        description: document.description || "",
        projectCategory: document.projectCategory,
        locales: loadedLocales,
      })
    );
  }, [document]);

  const handleLocaleChange = (
    locale: DocumentLocaleCode,
    field: "title" | "content",
    value: string
  ) => {
    setLocales((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));
    if (locale === "en") {
      if (field === "title") setTitle(value);
      if (field === "content") setContent(value);
    }
  };

  const localesPayload = useMemo(
    () =>
      DOCUMENT_LOCALES.map(({ code }) => ({
        locale: code,
        title: locales[code].title,
        content: locales[code].content,
      })),
    [locales]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const primaryTitle = locales.en.title || title;
      const primaryContent = locales.en.content || content;

      if (isNew) {
        await createDoc.mutateAsync({
          title: primaryTitle,
          description,
          content: primaryContent,
          projectCategory,
          locales: localesPayload,
        });
      } else if (documentId) {
        await updateDoc.mutateAsync({
          id: documentId,
          title: primaryTitle,
          description,
          content: primaryContent,
          projectCategory,
          locales: localesPayload,
        });
        setSavedSnapshot(currentSnapshot);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const ensureDocumentId = useCallback(async (): Promise<number> => {
    if (documentId) return documentId;

    const result = await createDoc.mutateAsync({
      title: locales.en.title || title || "Untitled",
      description,
      content: locales.en.content || content || "<p></p>",
      projectCategory,
      locales: localesPayload,
    });
    return result.id as number;
  }, [documentId, createDoc, locales, title, description, content, projectCategory, localesPayload]);

  const uploadFile = async (file: File): Promise<FileUploadResult> => {
    const docId = await ensureDocumentId();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    return uploadAttachment.mutateAsync({
      documentId: docId,
      fileName: file.name,
      fileData: base64,
      mimeType: inferMimeType(file),
    });
  };

  const handleImageUpload = async (file: File) => {
    const result = await uploadFile(file);
    return result.url;
  };

  const handleAddInlineComment = async (from: number, to: number, text: string) => {
    if (!documentId) {
      const docId = await ensureDocumentId();
      await addComment.mutateAsync({
        documentId: docId,
        content: text,
        position: from,
        selectionEnd: to,
      });
      return;
    }

    await addComment.mutateAsync({
      documentId,
      content: text,
      position: from,
      selectionEnd: to,
    });
  };

  const handleAddNote = async (
    locale: import("@/lib/documentLocales").DocumentLocaleCode,
    position: number,
    content: string
  ) => {
    const docId = documentId ?? (await ensureDocumentId());
    const result = await createNote.mutateAsync({
      documentId: docId,
      locale,
      content,
      position,
    });
    return { id: result.id, noteNumber: result.noteNumber };
  };

  const fileAnnotationBase = useMemo<FileAnnotationBase>(
    () => ({
      documentId,
      activeFileNoteId,
      setActiveFileNoteId,
      ensureDocumentId,
      onAddFileNote: async (locale: DocumentLocaleCode, input) => {
        const docId = documentId ?? (await ensureDocumentId());
        const result = await createFileNote.mutateAsync({
          documentId: docId,
          locale,
          ...input,
        });
        return { id: result.id, noteNumber: result.noteNumber };
      },
      onUpdateFileNote: async (noteId, content) => {
        await updateFileNote.mutateAsync({ noteId, content });
      },
    }),
    [documentId, activeFileNoteId, ensureDocumentId, createFileNote, updateFileNote]
  );

  const categories = ["Backend", "Frontend", "DevOps", "Design", "Product"];

  return (
    <EditorialLayout fullScreen>
      <div className="editorial-layout-full">
        <div className="flex items-center justify-between gap-3 shrink-0 pb-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate("/documents")} className="gap-1 shrink-0">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Input
              value={locales.en.title}
              onChange={(e) => handleLocaleChange("en", "title", e.target.value)}
              placeholder="Document title..."
              className="h-9 font-semibold border-0 shadow-none focus-visible:ring-0 max-w-md"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? "Hide details" : "Details"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !(locales.en.title || title)}
              size="sm"
              variant={isSaved ? "secondary" : "default"}
              className={`gap-2 min-w-24 ${
                isSaved
                  ? "bg-emerald-600 text-white hover:bg-emerald-600/90 border-emerald-600"
                  : ""
              }`}
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>

        {showDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 shrink-0 border-b border-border">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="min-h-16 text-sm"
            />
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value)}
              className="h-9 px-3 border border-border rounded-sm bg-background text-foreground text-sm"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        <Tabs defaultValue="editor" className="flex flex-col flex-1 min-h-0 gap-2 pt-2">
          <TabsList className="grid w-full max-w-lg grid-cols-3 shrink-0 h-9">
            <TabsTrigger value="editor" className="text-xs">
              Editor
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <Clock className="w-3.5 h-3.5" />
              History ({revisions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden">
            <p className="text-xs text-muted-foreground mb-2 shrink-0">
              Embed PDF/PPT with paperclip. Use &quot;Add note&quot; on embedded files to annotate by position.
            </p>
            <MultilingualEditor
              locales={locales}
              onLocaleChange={handleLocaleChange}
              onImageUpload={handleImageUpload}
              onFileUpload={uploadFile}
              comments={comments}
              activeCommentId={activeCommentId}
              onCommentClick={setActiveCommentId}
              onAddInlineComment={handleAddInlineComment}
              notes={notes}
              activeNoteId={activeNoteId}
              onNoteClick={(id) => {
                setActiveNoteId(id);
                window.document.getElementById(`footnote-${id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
              onAddNote={handleAddNote}
              onUpdateNote={async (noteId, content) => {
                await updateNote.mutateAsync({ noteId, content });
              }}
              fileAnnotationBase={fileAnnotationBase}
              fileNotes={fileNotes}
            />
          </TabsContent>

          <TabsContent value="comments" className="flex-1 min-h-0 overflow-auto mt-0 data-[state=inactive]:hidden">
              {documentId ? (
                <InlineComments
                  comments={comments.map((c) => ({
                    ...c,
                    resolved: c.resolved ?? 0,
                  }))}
                  onAddComment={async (text) =>
                    addComment.mutateAsync({ documentId, content: text })
                  }
                  onResolveComment={async (commentId) =>
                    resolveComment.mutateAsync({ commentId, resolved: 1 })
                  }
                  onDeleteComment={async (commentId) =>
                    deleteComment.mutateAsync({ commentId })
                  }
                />
              ) : (
                <div className="editorial-card text-center py-8 text-muted-foreground">
                  Save the document first to add comments
                </div>
              )}
            </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 overflow-auto mt-0 data-[state=inactive]:hidden">
              {revisions.length > 0 ? (
                <div className="space-y-4">
                  {revisions.map((revision: { id: number; changeDescription?: string | null }, index: number) => (
                    <div key={revision.id} className="editorial-card">
                      <p className="font-semibold text-sm">Version {revisions.length - index}</p>
                      <p className="text-xs editorial-meta">{revision.changeDescription}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="editorial-card text-center py-8 text-muted-foreground">
                  No revision history yet
                </div>
              )}
            </TabsContent>
        </Tabs>
      </div>
    </EditorialLayout>
  );
}
