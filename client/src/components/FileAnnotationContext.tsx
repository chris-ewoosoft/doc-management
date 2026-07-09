import { createContext, useContext } from "react";
import type { DocumentLocaleCode, EditorFileNote } from "@/lib/documentLocales";

export interface FileNoteInput {
  embeddedId: string;
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "ppt";
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  content: string;
}

export interface FileAnnotationBase {
  documentId: number | null;
  activeFileNoteId: number | null;
  setActiveFileNoteId: (id: number | null) => void;
  ensureDocumentId: () => Promise<number>;
  onAddFileNote: (
    locale: DocumentLocaleCode,
    input: FileNoteInput
  ) => Promise<{ id: number; noteNumber: number }>;
  onUpdateFileNote: (noteId: number, content: string) => Promise<void>;
}

export interface FileAnnotationContextValue extends Omit<FileAnnotationBase, "onAddFileNote"> {
  locale: DocumentLocaleCode;
  fileNotes: EditorFileNote[];
  onAddFileNote: (input: FileNoteInput) => Promise<{ id: number; noteNumber: number }>;
}

export const FileAnnotationContext = createContext<FileAnnotationContextValue | null>(null);

export function useFileAnnotation() {
  return useContext(FileAnnotationContext);
}
